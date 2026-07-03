from typing import List, Dict

from fastapi import APIRouter

from scheduler_engine.engine_instance import engine
from scheduler_engine.models.schedule import Schedule
from scheduler_engine.models.activity import Activity

router = APIRouter(prefix="/scheduler")


@router.post("/load")
def load(activities: List[Dict]):
    schedule = Schedule()

    for a in activities:
        schedule.add(Activity(**a))

    engine.load(schedule)

    return {
        "status": "ok",
        "loaded": len(schedule.all())
    }


@router.get("/state")
def state():
    return {
        "activities": [
            {
                "id": a.id,
                "teacher": a.teacher,
                "subject": a.subject,
                "group": a.group,
                "room": a.room,
                "day": a.day,
                "start": a.start,
                "duration": a.duration,
            }
            for a in engine.state.all()
        ],
        "conflicts": engine.validate(),
    }