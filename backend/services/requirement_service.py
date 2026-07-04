from typing import Dict, List, Optional

from backend.models.teaching_block import TeachingBlock
from backend.models.teaching_requirement import TeachingRequirement
from backend.repositories.requirement_repository import RequirementRepository
from backend.services.block_generator import BlockGenerator


class RequirementService:
    """Business logic for TeachingRequirement.

    All persistence operations go through the repository.
    """

    def __init__(self, repo: RequirementRepository):
        self.repo = repo

    def create(self, payload: Dict) -> TeachingRequirement:
        # normalize/validate payload and construct domain model
        # id can be provided or assigned by repository
        tr = TeachingRequirement(
            id=payload.get("id"),
            group_id=str(payload["group_id"]),
            subject_id=str(payload["subject_id"]),
            teacher_id=str(payload["teacher_id"]),
            weekly_hours=payload["weekly_hours"],
            min_days=payload["min_days"],
            max_days=payload["max_days"],
            min_block_duration=payload["min_block_duration"],
            max_consecutive_hours=payload["max_consecutive_hours"],
            allow_half_hour_blocks=payload.get("allow_half_hour_blocks", False),
            preferred_distribution=payload.get("preferred_distribution", {}),
            preferred_rooms=payload.get("preferred_rooms", []),
            fixed_teacher=payload.get("fixed_teacher", False),
            priority=payload.get("priority", 2),
        )

        # repository handles id assignment
        created = self.repo.create(tr)
        return created

    def get(self, requirement_id: str) -> Optional[TeachingRequirement]:
        return self.repo.get(requirement_id)

    def list(self) -> List[TeachingRequirement]:
        return self.repo.list()

    def update(self, requirement_id: str, data: Dict) -> TeachingRequirement:
        # validate fields before persisting
        # create a shallow merged dict and let repository/model validate
        existing = self.repo.get(requirement_id)
        if existing is None:
            raise KeyError("requirement_not_found")

        merged = existing.__dict__.copy()
        merged.update(data)

        # construct a temporay domain object to validate
        tmp = TeachingRequirement(
            id=merged.get("id"),
            group_id=str(merged["group_id"]),
            subject_id=str(merged["subject_id"]),
            teacher_id=str(merged["teacher_id"]),
            weekly_hours=merged["weekly_hours"],
            min_days=merged["min_days"],
            max_days=merged["max_days"],
            min_block_duration=merged["min_block_duration"],
            max_consecutive_hours=merged["max_consecutive_hours"],
            allow_half_hour_blocks=merged.get("allow_half_hour_blocks", False),
            preferred_distribution=merged.get("preferred_distribution", {}),
            preferred_rooms=merged.get("preferred_rooms", []),
            fixed_teacher=merged.get("fixed_teacher", False),
            priority=merged.get("priority", 2),
        )

        # if no exception raised, persist via repository
        updated = self.repo.update(requirement_id, data)
        if updated is None:
            raise KeyError("requirement_not_found")

        return updated

    def delete(self, requirement_id: str) -> bool:
        return self.repo.delete(requirement_id)

    def generate_blocks(self, requirement_id: str) -> List[List[TeachingBlock]]:
        requirement = self.repo.get(requirement_id)
        if requirement is None:
            raise KeyError("requirement_not_found")

        generator = BlockGenerator()
        return generator.generate(requirement)
