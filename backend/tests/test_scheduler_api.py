from backend.routes.requirements import service
from backend.routes.scheduler import GenerateRequest, generate_proposals


def test_scheduler_generation_endpoint_returns_proposals_from_requirements() -> None:
    requirement = service.create(
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
