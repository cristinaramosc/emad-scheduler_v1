class TeacherConflictConstraint:
    def validate(self, schedule):
        conflicts = []
        occupied = {}

        for activity in schedule.all():
            key = (activity.teacher, activity.day, activity.start)

            if key in occupied:
                conflicts.append({
                    "type": "teacher_conflict",
                    "teacher": activity.teacher,
                    "day": activity.day,
                    "start": activity.start,
                })
            else:
                occupied[key] = activity

        return conflicts