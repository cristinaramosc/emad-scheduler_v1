from fastapi import APIRouter

from services.activity_service import get_teacher_activities

router = APIRouter()


@router.get("/activities")
def activities(teacher_id: int):
    return get_teacher_activities(teacher_id)