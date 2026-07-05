import pytest
from fastapi import HTTPException

from backend.dependencies import get_proposal_store, get_requirement_service
from backend.routes.scheduler import GenerateRequest, accept_proposal, generate_proposals
from backend.scheduler_engine.engine_instance import engine as shared_engine
from backend.scheduler_engine.models import Activity, Schedule, ScheduleProposal


@pytest.fixture(autouse=True)
def reset_state() -> None:
    get_proposal_store().clear()
    shared_engine.load(Schedule())


def test_scheduler_generation_endpoint_returns_proposals_from_requirements() -> None:
    requirement = get_requirement_service().create(
        {
            "group_id": "g1",
            "subject_id": "s1",
            "teacher_id": "t1",
            "weekly_hours": 2.0,
            "min_days": 1,
            "max_days": 2,
            "min_block_duration": 1.0,
            "max_consecutive_hours": 2.0,
            "allow_half_hour_blocks": False,
        }
    )

    body = generate_proposals(GenerateRequest(requirement_ids=[requirement.id]))

    assert body["valid"] is True
    assert body["best_proposal"] is not None
    assert body["proposals"]
    assert body["scores"]
    assert body["statistics"]["proposals_generated"] >= 1
    assert body["statistics"]["blocks_total"] >= 1


def test_scheduler_generation_endpoint_rejects_empty_requests() -> None:
    with pytest.raises(HTTPException) as excinfo:
        generate_proposals(GenerateRequest(requirement_ids=[]))

    assert excinfo.value.status_code == 400


def test_scheduler_generation_endpoint_rejects_unknown_requirements() -> None:
    with pytest.raises(HTTPException) as excinfo:
        generate_proposals(GenerateRequest(requirement_ids=["missing-id"]))

    assert excinfo.value.status_code == 404


def test_proposal_can_be_accepted_and_updates_active_schedule() -> None:
    proposal = ScheduleProposal(
        id="proposal-1",
        activities=[
            Activity(
                id=1,
                teacher="t1",
                subject="Math",
                group="g1",
                room="r1",
                day="Day 0",
                start="Period 0",
                duration=1,
            )
        ],
    )
    get_proposal_store()[proposal.id] = proposal

    result = accept_proposal(proposal.id)

    assert result["ok"] is True
    assert len(shared_engine.state.all()) == 1
    assert shared_engine.state.all()[0].id == 1


def test_invalid_proposals_cannot_be_accepted() -> None:
    proposal = ScheduleProposal(
        id="proposal-invalid",
        activities=[
            Activity(
                id=1,
                teacher="t1",
                subject="Math",
                group="g1",
                room="r1",
                day="Day 0",
                start="Period 0",
                duration=1,
            ),
            Activity(
                id=2,
                teacher="t1",
                subject="Science",
                group="g2",
                room="r2",
                day="Day 0",
                start="Period 0",
                duration=1,
            ),
        ],
    )
    get_proposal_store()[proposal.id] = proposal

    result = accept_proposal(proposal.id)

    assert result["ok"] is False
    assert result["conflicts"]
    assert len(shared_engine.state.all()) == 0
