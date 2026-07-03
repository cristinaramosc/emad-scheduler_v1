from fastapi import APIRouter
from pydantic import BaseModel

from scheduler_engine.engine import SchedulerEngine
from scheduler_engine.models import Schedule, Activity

router = APIRouter(prefix="/scheduler", tags=["Scheduler"])


class ActivityDto(BaseModel):
    id: int
    teacher: str
    subject: str
    group: str
    room: str
    day: str
    start: str
    duration: int


@router.post("/validate")
def validate(activities: list[ActivityDto]):
    schedule = Schedule()

    for activity in activities:
        schedule.add(
            Activity(
                id=activity.id,
                teacher=activity.teacher,
                subject=activity.subject,
                group=activity.group,
                room=activity.room,
                day=activity.day,
                start=activity.start,
                duration=activity.duration,
            )
        )

    engine = SchedulerEngine()

    conflicts = engine.validate(schedule)

    return conflicts