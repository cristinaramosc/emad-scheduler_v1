from typing import List, Dict

from fastapi import APIRouter

try:
    from dependencies import get_live_schedule_use_cases
    from schemas.scheduler import MoveDTO
except ModuleNotFoundError:  # pragma: no cover - supports tests running from repo root
    from backend.dependencies import get_live_schedule_use_cases
    from backend.schemas.scheduler import MoveDTO

router = APIRouter(prefix="/scheduler")


@router.post("/load")
def load(activities: List[Dict]):
    use_cases = get_live_schedule_use_cases()
    return use_cases.load(activities)


@router.post("/load-fet")
def load_fet():
    use_cases = get_live_schedule_use_cases()
    return use_cases.load_fet()


@router.get("/state")
def state():
    use_cases = get_live_schedule_use_cases()
    return use_cases.state()


@router.post("/move")
def move(move_data: MoveDTO):
    use_cases = get_live_schedule_use_cases()
    return use_cases.move(move_data.activity_id, move_data.day, move_data.start)
