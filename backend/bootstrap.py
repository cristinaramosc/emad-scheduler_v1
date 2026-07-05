from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Optional

try:
    from application.explanation_use_cases import ExplanationUseCases
    from application.live_schedule_use_cases import LiveScheduleUseCases
    from application.scheduler_use_cases import SchedulerUseCases
    from repositories.requirement_repository import RequirementRepository
    from scheduler_engine.engine_instance import engine as scheduler_engine
    from scheduler_engine.models import ScheduleProposal
    from services.decision_explainer import DecisionExplainer
    from services.fet_importer import load_activities
    from services.requirement_service import RequirementService
except ModuleNotFoundError:  # pragma: no cover
    from backend.application.explanation_use_cases import ExplanationUseCases
    from backend.application.live_schedule_use_cases import LiveScheduleUseCases
    from backend.application.scheduler_use_cases import SchedulerUseCases
    from backend.repositories.requirement_repository import RequirementRepository
    from backend.scheduler_engine.engine_instance import engine as scheduler_engine
    from backend.scheduler_engine.models import ScheduleProposal
    from backend.services.decision_explainer import DecisionExplainer
    from backend.services.fet_importer import load_activities
    from backend.services.requirement_service import RequirementService


@dataclass
class AppDependencies:
    requirement_repo: RequirementRepository
    requirement_service: RequirementService
    proposal_store: Dict[str, ScheduleProposal] = field(default_factory=dict)
    scheduler_use_cases: Optional[SchedulerUseCases] = None
    live_schedule_use_cases: Optional[LiveScheduleUseCases] = None
    explanation_use_cases: Optional[ExplanationUseCases] = None


_APP_DEPS: AppDependencies | None = None


def build_dependencies() -> AppDependencies:
    requirement_repo = RequirementRepository()
    requirement_service = RequirementService(requirement_repo)
    proposal_store: Dict[str, ScheduleProposal] = {}

    scheduler_use_cases = SchedulerUseCases(
        requirement_repo=requirement_repo,
        scheduler_engine=scheduler_engine,
        proposal_store=proposal_store,
    )
    live_schedule_use_cases = LiveScheduleUseCases(
        engine=scheduler_engine,
        load_activities_fn=load_activities,
        fet_file=Path(__file__).resolve().parents[1] / "EMAD_2627_.fet",
    )
    explanation_use_cases = ExplanationUseCases(DecisionExplainer(scheduler_engine))

    return AppDependencies(
        requirement_repo=requirement_repo,
        requirement_service=requirement_service,
        proposal_store=proposal_store,
        scheduler_use_cases=scheduler_use_cases,
        live_schedule_use_cases=live_schedule_use_cases,
        explanation_use_cases=explanation_use_cases,
    )


def get_dependencies() -> AppDependencies:
    global _APP_DEPS
    if _APP_DEPS is None:
        _APP_DEPS = build_dependencies()
    return _APP_DEPS


def reset_dependencies() -> None:
    global _APP_DEPS
    _APP_DEPS = None
