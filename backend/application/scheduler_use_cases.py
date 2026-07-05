from __future__ import annotations

from typing import Any, Dict, List

try:
    from models.teaching_requirement import TeachingRequirement
    from scheduler_engine.engine import SchedulerEngine
    from scheduler_engine.generator import SchedulerGenerator
    from scheduler_engine.models import Activity, GenerationContext, Schedule, SchoolCalendar, ScheduleProposal
except ModuleNotFoundError:  # pragma: no cover
    from backend.models.teaching_requirement import TeachingRequirement
    from backend.scheduler_engine.engine import SchedulerEngine
    from backend.scheduler_engine.generator import SchedulerGenerator
    from backend.scheduler_engine.models import Activity, GenerationContext, Schedule, SchoolCalendar, ScheduleProposal

from .serializers import serialize_conflict, serialize_conflicts, serialize_proposal


class SchedulerUseCases:
    def __init__(
        self,
        requirement_repo: Any,
        scheduler_engine: SchedulerEngine,
        proposal_store: Dict[str, ScheduleProposal],
    ) -> None:
        self._requirement_repo = requirement_repo
        self._scheduler_engine = scheduler_engine
        self._proposal_store = proposal_store

    def validate(self, activities: List[Dict[str, Any]]) -> List[Any]:
        schedule = Schedule()
        for activity in activities:
            schedule.add(
                Activity(
                    id=activity["id"],
                    teacher=activity["teacher"],
                    subject=activity["subject"],
                    group=activity["group"],
                    room=activity["room"],
                    day=activity["day"],
                    start=activity["start"],
                    duration=activity["duration"],
                )
            )

        engine = SchedulerEngine()
        return engine.validate(schedule)

    def generate_proposals(self, requirement_ids: List[str]) -> Dict[str, Any]:
        if not requirement_ids:
            raise ValueError("missing_requirement_ids")

        requirements: List[TeachingRequirement] = []
        for requirement_id in requirement_ids:
            requirement = self._requirement_repo.get(requirement_id)
            if requirement is not None:
                requirements.append(requirement)

        if not requirements:
            raise LookupError("requirements_not_found")

        context = GenerationContext(
            school_calendar=SchoolCalendar(days=[0, 1], periods_per_day=6),
            existing_scheduled_activities=(),
            fixed_activities=(),
            blocked_time_slots=(),
            configuration={"room_constraints_enabled": False},
        )
        generator = SchedulerGenerator()
        generation_result = generator.generate(requirements, context)

        if not generation_result.valid or not generation_result.proposals:
            raise RuntimeError("generation_failed")

        for proposal in generation_result.proposals:
            self._proposal_store[proposal.id] = proposal

        return {
            "valid": generation_result.valid,
            "best_proposal": serialize_proposal(generation_result.schedule_proposal),
            "proposals": [serialize_proposal(proposal) for proposal in generation_result.proposals],
            "scores": [proposal.score for proposal in generation_result.proposals],
            "conflicts": [
                [serialize_conflict(conflict) for conflict in proposal.conflicts]
                for proposal in generation_result.proposals
            ],
            "statistics": generation_result.statistics,
        }

    def accept_proposal(self, proposal_id: str) -> Dict[str, Any]:
        proposal = self._proposal_store.get(proposal_id)
        if proposal is None:
            raise LookupError("proposal_not_found")

        accepted_schedule = Schedule()
        for activity in proposal.activities:
            accepted_schedule.add(activity)

        conflicts = self._scheduler_engine.validate(accepted_schedule)
        if conflicts:
            return {
                "ok": False,
                "conflicts": serialize_conflicts(conflicts),
            }

        self._scheduler_engine.load(accepted_schedule)
        return {
            "ok": True,
            "message": "Proposal accepted",
        }
