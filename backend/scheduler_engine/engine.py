from scheduler_engine.constraints import TeacherConflictConstraint


class SchedulerEngine:
    """Core scheduling engine."""

    def __init__(self):
        self.constraints = [
            TeacherConflictConstraint(),
        ]

    def add_constraint(self, constraint):
        self.constraints.append(constraint)

    def validate(self, schedule):
        conflicts = []

        for constraint in self.constraints:
            conflicts.extend(constraint.validate(schedule))

        return conflicts