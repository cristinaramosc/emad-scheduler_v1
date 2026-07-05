from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.models.teaching_requirement import TeachingRequirement
from backend.routes.requirements import repo as requirement_repo
from backend.scheduler_engine.engine import SchedulerEngine
from backend.scheduler_engine.engine_instance import engine as scheduler_engine
from backend.scheduler_engine.generator import SchedulerGenerator
from backend.scheduler_engine.models import Activity, GenerationContext, Schedule, SchoolCalendar, ScheduleProposal

router = APIRouter(prefix="/scheduler", tags=["Scheduler"])

proposal_store: Dict[str, ScheduleProposal] = {}


class ActivityDto(BaseModel):
    id: int
    teacher: str
    subject: str
    group: str
    room: str
    day: str
    start: str
    duration: int


class GenerateRequest(BaseModel):
    requirement_ids: List[str]


def _serialize_activity(activity: Activity) -> Dict[str, Any]:
    return {
        "id": activity.id,
        "teacher": activity.teacher,
        "subject": activity.subject,
        "group": activity.group,
        "room": activity.room,
        "day": activity.day,
        "start": activity.start,
        "duration": activity.duration,
    }


def _serialize_proposal(proposal: ScheduleProposal | None) -> Dict[str, Any] | None:
    if proposal is None:
        return None

    return {
        "id": proposal.id,
        "activities": [_serialize_activity(activity) for activity in proposal.activities],
        "score": proposal.score,
        "warnings": proposal.warnings,
        "conflicts": [
            {
                "type": conflict.type,
                "message": conflict.message,
                "teacher": conflict.teacher,
                "day": conflict.day,
                "start": conflict.start,
                "activities": conflict.activities,
            }
            for conflict in proposal.conflicts
        ],
    }


def _serialize_conflicts(conflicts: List[Any]) -> List[Dict[str, Any]]:
    return [
        {
            "type": conflict.type,
            "message": conflict.message,
            "teacher": conflict.teacher,
            "day": conflict.day,
            "start": conflict.start,
            "activities": conflict.activities,
        }
        for conflict in conflicts
    ]


@router.post("/validate")
def validate(activities: list[ActivityDto]):
    schedule = Schedule()

    for activity in activities:
        schedule.add(
            Activity(
                id=activity.id,
                teacher=activity.teacher,
                subject=activity.subject,
                group=activity.group,
                room=activity.room,
                day=activity.day,
                start=activity.start,
                duration=activity.duration,
            )
        )

    engine = SchedulerEngine()

    conflicts = engine.validate(schedule)

    return conflicts


@router.post("/generate")
def generate_proposals(payload: GenerateRequest):
    if not payload.requirement_ids:
        raise HTTPException(status_code=400, detail="At least one teaching requirement is required")

    requirements: List[TeachingRequirement] = []
    for requirement_id in payload.requirement_ids:
        requirement = requirement_repo.get(requirement_id)
        if requirement is None:
            continue
        requirements.append(requirement)

    if not requirements:
        raise HTTPException(status_code=404, detail="No teaching requirements were found")

    context = GenerationContext(
        school_calendar=SchoolCalendar(days=[0, 1], periods_per_day=6),
        existing_scheduled_activities=(),
        fixed_activities=(),
        blocked_time_slots=(),
        configuration={"room_constraints_enabled": False},
    )
    generator = SchedulerGenerator()
    try:
        generation_result = generator.generate(requirements, context)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Scheduling generation failed") from exc

    if not generation_result.valid or not generation_result.proposals:
        raise HTTPException(status_code=500, detail="Scheduling generation produced no proposals")

    for proposal in generation_result.proposals:
        proposal_store[proposal.id] = proposal

    return {
        "valid": generation_result.valid,
        "best_proposal": _serialize_proposal(generation_result.schedule_proposal),
        "proposals": [_serialize_proposal(proposal) for proposal in generation_result.proposals],
        "scores": [proposal.score for proposal in generation_result.proposals],
        "conflicts": [
            [
                {
                    "type": conflict.type,
                    "message": conflict.message,
                    "teacher": conflict.teacher,
                    "day": conflict.day,
                    "start": conflict.start,
                    "activities": conflict.activities,
                }
                for conflict in proposal.conflicts
            ]
            for proposal in generation_result.proposals
        ],
        "statistics": generation_result.statistics,
    }


@router.post("/proposal/{proposal_id}/accept")
def accept_proposal(proposal_id: str):
    proposal = proposal_store.get(proposal_id)
    if proposal is None:
        raise HTTPException(status_code=404, detail="proposal_not_found")

    accepted_schedule = Schedule()
    for activity in proposal.activities:
        accepted_schedule.add(activity)

    conflicts = scheduler_engine.validate(accepted_schedule)
    if conflicts:
        return {
            "ok": False,
            "conflicts": _serialize_conflicts(conflicts),
        }

    scheduler_engine.load(accepted_schedule)
    return {
        "ok": True,
        "message": "Proposal accepted",
    }