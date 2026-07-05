from typing import Dict, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.dependencies import get_proposal_store, get_scheduler_use_cases

router = APIRouter(prefix="/scheduler", tags=["Scheduler"])
proposal_store = get_proposal_store()


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


@router.post("/validate")
def validate(activities: list[ActivityDto]):
    use_cases = get_scheduler_use_cases()
    return use_cases.validate([activity.dict() for activity in activities])


@router.post("/generate")
def generate_proposals(payload: GenerateRequest):
    use_cases = get_scheduler_use_cases()
    try:
        return use_cases.generate_proposals(payload.requirement_ids)
    except ValueError:
        raise HTTPException(status_code=400, detail="At least one teaching requirement is required")
    except LookupError:
        raise HTTPException(status_code=404, detail="No teaching requirements were found")
    except RuntimeError:
        raise HTTPException(status_code=500, detail="Scheduling generation produced no proposals")
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Scheduling generation failed") from exc


@router.post("/proposal/{proposal_id}/accept")
def accept_proposal(proposal_id: str):
    use_cases = get_scheduler_use_cases()
    try:
        return use_cases.accept_proposal(proposal_id)
    except LookupError:
        raise HTTPException(status_code=404, detail="proposal_not_found")

