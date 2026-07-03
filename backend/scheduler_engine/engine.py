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

    def move_activity(self, activity_id: int, *, day: str, start: str):
        for activity in self.state.all():
            if activity.id == activity_id:
                activity.day = day
                activity.start = start
                return activity

        return None

    def validate(self, schedule=None):
        if schedule is None:
            schedule = self.state

        conflicts = []
        for c in self.constraints:
            conflicts.extend(c.validate(schedule))

        return conflicts

    def get_conflicts(self):
        return self.validate()
