from pathlib import Path
from typing import List, Dict

from fastapi import APIRouter

from schemas.scheduler import MoveDTO
from services.fet_importer import load_activities
from scheduler_engine.engine_instance import engine
from scheduler_engine.models.schedule import Schedule
from scheduler_engine.models.activity import Activity

router = APIRouter(prefix="/scheduler")
FET_FILE = Path(__file__).resolve().parents[2] / "EMAD_2627_.fet"


def fet_activity_to_scheduler_activity(activity):
    return Activity(
        id=activity["fet_id"],
        teacher=activity["teacher"] or "",
        subject=activity["subject"] or "",
        group=activity["group_name"] or "",
        room=activity["room"] or "",
        day=activity["day"] or "",
        start=activity["start"] or "",
        duration=activity["duration"],
    )


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


@router.post("/load-fet")
def load_fet():
    schedule = Schedule()

    for activity in load_activities(FET_FILE):
        schedule.add(fet_activity_to_scheduler_activity(activity))

    engine.load(schedule)

    return {
        "ok": True,
        "loaded": len(schedule.all()),
        **serialize_state(),
    }


def serialize_state():
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


@router.get("/state")
def state():
    return serialize_state()


@router.post("/move")
def move(move_data: MoveDTO):
    activity = engine.move_activity(
        move_data.activity_id,
        day=move_data.day,
        start=move_data.start,
    )

    if activity is None:
        return {
            "ok": False,
            "error": "activity_not_found",
            **serialize_state(),
        }

    return {
        "ok": True,
        **serialize_state(),
    }
