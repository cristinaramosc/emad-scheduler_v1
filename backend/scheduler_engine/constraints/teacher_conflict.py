from scheduler_engine.constraints.base import Constraint
from scheduler_engine.models import Conflict


class TeacherConflictConstraint(Constraint):
    """Detecta si un professor té més d'una activitat al mateix temps."""

    def validate(self, schedule):
        conflicts = []
        occupied = {}

        for activity in schedule.all():
            if not activity.teacher or not activity.day or not activity.start:
                continue

            key = (activity.teacher, activity.day, activity.start)

            if key in occupied:
                activities = [
                    occupied[key].id,
                    activity.id,
                ]

                conflicts.append(
                    Conflict(
                        type="teacher_conflict",
                        message=(
                            f"Teacher '{activity.teacher}' has more than "
                            f"one activity on {activity.day} at {activity.start}."
                        ),
                        teacher=activity.teacher,
                        day=activity.day,
                        start=activity.start,
                        activities=activities,
                        data={
                            "teacher": activity.teacher,
                            "day": activity.day,
                            "start": activity.start,
                            "activities": activities,
                        },
                    )
                )
            else:
                occupied[key] = activity

        return conflicts
