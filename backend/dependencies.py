from __future__ import annotations

try:
    from application.explanation_use_cases import ExplanationUseCases
    from application.live_schedule_use_cases import LiveScheduleUseCases
    from application.scheduler_use_cases import SchedulerUseCases
    from bootstrap import get_dependencies
    from repositories.requirement_repository import RequirementRepository
    from services.requirement_service import RequirementService
except ModuleNotFoundError:  # pragma: no cover
    from backend.application.explanation_use_cases import ExplanationUseCases
    from backend.application.live_schedule_use_cases import LiveScheduleUseCases
    from backend.application.scheduler_use_cases import SchedulerUseCases
    from backend.bootstrap import get_dependencies
    from backend.repositories.requirement_repository import RequirementRepository
    from backend.services.requirement_service import RequirementService


def get_requirement_repo() -> RequirementRepository:
    return get_dependencies().requirement_repo


def get_requirement_service() -> RequirementService:
    return get_dependencies().requirement_service


def get_scheduler_use_cases() -> SchedulerUseCases:
    return get_dependencies().scheduler_use_cases


def get_live_schedule_use_cases() -> LiveScheduleUseCases:
    return get_dependencies().live_schedule_use_cases


def get_explanation_use_cases() -> ExplanationUseCases:
    return get_dependencies().explanation_use_cases


def get_proposal_store() -> dict:
    return get_dependencies().proposal_store
