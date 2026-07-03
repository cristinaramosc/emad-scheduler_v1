from dataclasses import dataclass, field


@dataclass
class Schedule:
    activities: list = field(default_factory=list)

    def add(self, activity):
        self.activities.append(activity)

    def remove(self, activity):
        self.activities.remove(activity)

    def all(self):
        return self.activities