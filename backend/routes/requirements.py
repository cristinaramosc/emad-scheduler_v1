from dataclasses import asdict
from typing import Dict, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.requirement_service import RequirementService
from repositories.requirement_repository import RequirementRepository

from backend.models.teaching_requirement import TeachingRequirement

router = APIRouter()

repo = RequirementRepository()
service = RequirementService(repo)


class RequirementCreateDTO(BaseModel):
    group_id: str
    subject_id: str
    teacher_id: str
    weekly_hours: float
    min_days: int
    max_days: int
    min_block_duration: float
    max_consecutive_hours: float
    allow_half_hour_blocks: bool = False
    preferred_distribution: Dict[str, int] = {}
    preferred_rooms: Optional[list[str]] = None
    fixed_teacher: bool = False
    priority: int = 2


class RequirementUpdateDTO(BaseModel):
    group_id: Optional[str] = None
    subject_id: Optional[str] = None
    teacher_id: Optional[str] = None
    weekly_hours: Optional[float] = None
    min_days: Optional[int] = None
    max_days: Optional[int] = None
    min_block_duration: Optional[float] = None
    max_consecutive_hours: Optional[float] = None
    allow_half_hour_blocks: Optional[bool] = None
    preferred_distribution: Optional[Dict[str, int]] = None
    preferred_rooms: Optional[list[str]] = None
    fixed_teacher: Optional[bool] = None
    priority: Optional[int] = None


def serialize_requirement(requirement: TeachingRequirement) -> Dict:
    return asdict(requirement)


@router.get("/requirements")
def list_requirements():
    requirements = service.list()
    return [serialize_requirement(r) for r in requirements]


@router.post("/requirements")
def create_requirement(payload: RequirementCreateDTO):
    created = service.create(payload.dict())
    return serialize_requirement(created)


@router.patch("/requirements/{requirement_id}")
def update_requirement(requirement_id: str, payload: RequirementUpdateDTO):
    data = {k: v for k, v in payload.dict().items() if v is not None}
    try:
        updated = service.update(requirement_id, data)
    except KeyError:
        raise HTTPException(status_code=404, detail="requirement_not_found")
    return serialize_requirement(updated)


@router.delete("/requirements/{requirement_id}")
def delete_requirement(requirement_id: str):
    deleted = service.delete(requirement_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="requirement_not_found")
    return {"ok": True}
