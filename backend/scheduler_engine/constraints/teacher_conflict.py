from .base import Constraint

class TeacherConflictConstraint(Constraint):
    """Detects if a teacher is assigned to more than one lesson
    in the same time slot.
    """

    def validate(self, schedule):
        conflicts = []
        occupied = {}

        for lesson in schedule.all():
            key = (lesson.teacher_id, lesson.timeslot)

            if key in occupied:
                conflicts.append({
                    "type": "teacher_conflict",
                    "teacher_id": lesson.teacher_id,
                    "timeslot": lesson.timeslot,
                    "lessons": [occupied[key], lesson],
                })
            else:
                occupied[key] = lesson

        return conflicts