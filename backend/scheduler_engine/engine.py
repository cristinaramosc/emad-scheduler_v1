from scheduler_engine.models.schedule import Schedule
from scheduler_engine.constraints.teacher_conflict import TeacherConflictConstraint
from scheduler_engine.constraints.room_conflict import RoomConflictConstraint


class SchedulerEngine:
    def __init__(self):
        self.state = Schedule()
        self.constraints = [
            TeacherConflictConstraint(),
            RoomConflictConstraint(),
        ]

    def load(self, schedule: Schedule):
        self.state = schedule

    def validate(self, schedule=None):
        if schedule is None:
            schedule = self.state

        conflicts = []
        for c in self.constraints:
            conflicts.extend(c.validate(schedule))

        return conflicts

    def get_conflicts(self):
        return self.validate()
