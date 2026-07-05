from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List

try:
    from scheduler_engine.models.activity import Activity
    from scheduler_engine.models.schedule import Schedule
except ModuleNotFoundError:  # pragma: no cover
    from backend.scheduler_engine.models.activity import Activity
    from backend.scheduler_engine.models.schedule import Schedule

from .serializers import serialize_conflicts


class LiveScheduleUseCases:
    def __init__(self, engine: Any, load_activities_fn: Any, fet_file: Path) -> None:
        self._engine = engine
        self._load_activities_fn = load_activities_fn
        self._fet_file = fet_file

    def load(self, activities: List[Dict[str, Any]]) -> Dict[str, Any]:
        schedule = Schedule()
        for activity in activities:
            schedule.add(Activity(**activity))

        self._engine.load(schedule)
        return {"status": "ok", "loaded": len(schedule.all())}

    def load_fet(self) -> Dict[str, Any]:
        schedule = Schedule()
        for activity in self._load_activities_fn(self._fet_file):
            schedule.add(self._fet_to_scheduler_activity(activity))

        self._engine.load(schedule)
        return {
            "ok": True,
            "loaded": len(schedule.all()),
            **self.state(),
        }

    def state(self, conflicts: List[Any] | None = None) -> Dict[str, Any]:
        active_conflicts = conflicts if conflicts is not None else self._engine.validate()
        return {
            "activities": [
                {
                    "id": activity.id,
                    "teacher": activity.teacher,
                    "subject": activity.subject,
                    "group": activity.group,
                    "room": activity.room,
                    "day": activity.day,
                    "start": activity.start,
                    "duration": activity.duration,
                }
                for activity in self._engine.state.all()
            ],
            "conflicts": serialize_conflicts(active_conflicts),
        }

    def move(self, activity_id: int, day: str, start: str) -> Dict[str, Any]:
        activity = next((item for item in self._engine.state.all() if item.id == activity_id), None)
        if activity is None:
            return {
                "ok": False,
                "error": "activity_not_found",
                **self.state(),
            }

        previous_day = activity.day
        previous_start = activity.start
        activity.day = day
        activity.start = start

        conflicts = self._engine.validate()
        if conflicts:
            activity.day = previous_day
            activity.start = previous_start
            return {
                "ok": False,
                "error": "validation_failed",
                "conflicts": serialize_conflicts(conflicts),
                **self.state(),
            }

        return {
            "ok": True,
            **self.state(),
        }

    def _fet_to_scheduler_activity(self, activity: Dict[str, Any]) -> Activity:
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
