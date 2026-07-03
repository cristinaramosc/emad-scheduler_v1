from scheduler_engine.constraints.base import Constraint
from scheduler_engine.models import Conflict


class RoomConflictConstraint(Constraint):
    """Detecta si una aula està ocupada per més d'una activitat al mateix temps."""

    def validate(self, schedule):
        conflicts = []
        occupied = {}

        for activity in schedule.all():
            key = (
                activity.room,
                activity.day,
                activity.start,
            )

            if key in occupied:
                activities = [
                    occupied[key].id,
                    activity.id,
                ]

                conflicts.append(
                    Conflict(
                        type="room_conflict",
                        message=(
                            f"Room '{activity.room}' is occupied on "
                            f"{activity.day} at {activity.start}."
                        ),
                        room=activity.room,
                        day=activity.day,
                        start=activity.start,
                        activities=activities,
                        data={
                            "room": activity.room,
                            "day": activity.day,
                            "start": activity.start,
                            "activities": activities,
                        },
                    )
                )
            else:
                occupied[key] = activity

        return conflicts
