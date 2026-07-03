from fastapi import APIRouter

from services.teacher_service import get_all_teachers

router = APIRouter()


@router.get("/teachers")
def teachers():
    return get_all_teachers()