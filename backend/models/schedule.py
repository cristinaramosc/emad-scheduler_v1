from dataclasses import dataclass, field
from typing import List

from scheduler_engine.models.activity import Activity


@dataclass
class Schedule:
    activities: List[Activity] = field(default_factory=list)

    def add(self, activity: Activity):
        self.activities.append(activity)

    def remove(self, activity: Activity):
        self.activities.remove(activity)

    def all(self) -> List[Activity]:
        return self.activities