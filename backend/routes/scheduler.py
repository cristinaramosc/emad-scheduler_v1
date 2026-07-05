from typing import Any, Dict, List

from fastapi import APIRouter
from pydantic import BaseModel

from backend.models.teaching_requirement import TeachingRequirement
from backend.routes.requirements import repo as requirement_repo
from backend.scheduler_engine.engine import SchedulerEngine
from backend.scheduler_engine.generator import SchedulerGenerator
from backend.scheduler_engine.models import Activity, GenerationContext, Schedule, SchoolCalendar, ScheduleProposal

router = APIRouter(prefix="/scheduler", tags=["Scheduler"])


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
    requirements: List[TeachingRequirement] = []
    for requirement_id in payload.requirement_ids:
        requirement = requirement_repo.get(requirement_id)
        if requirement is None:
            continue
        requirements.append(requirement)

    if not requirements:
        return {
            "valid": False,
            "best_proposal": None,
            "proposals": [],
            "scores": [],
            "conflicts": [],
            "statistics": {"proposals_generated": 0},
        }

    context = GenerationContext(
        school_calendar=SchoolCalendar(days=[0, 1], periods_per_day=6),
        existing_scheduled_activities=(),
        fixed_activities=(),
        blocked_time_slots=(),
        configuration={"room_constraints_enabled": False},
    )
    generator = SchedulerGenerator()
    generation_result = generator.generate(requirements, context)

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