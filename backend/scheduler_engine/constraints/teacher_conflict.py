from scheduler_engine.constraints.base import Constraint
from scheduler_engine.models import Conflict


class TeacherConflictConstraint(Constraint):
    """Detecta si un professor té dues activitats al mateix dia i hora."""

    def validate(self, schedule):
        conflicts = []
        occupied = {}

        for activity in schedule.all():
            key = (
                activity.teacher,
                activity.day,
                activity.start,
            )

            if key in occupied:
                conflicts.append(
                    Conflict(
                        type="teacher_conflict",
                        message=(
                            f"Teacher '{activity.teacher}' has more than one "
                            f"activity on {activity.day} at {activity.start}."
                        ),
                        data={
                            "teacher": activity.teacher,
                            "day": activity.day,
                            "start": activity.start,
                            "activities": [
                                occupied[key].id,
                                activity.id,
                            ],
                        },
                    )
                )
            else:
                occupied[key] = activity

        return conflicts