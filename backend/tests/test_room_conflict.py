from scheduler_engine.engine import SchedulerEngine
from scheduler_engine.models import Schedule, Activity


def test_room_conflict():
    schedule = Schedule()

    schedule.add(
        Activity(
            id=1,
            teacher="Joan",
            subject="Dibuix",
            group="1A",
            room="A1",
            day="Monday",
            start="08:00",
            duration=2,
        )
    )

    schedule.add(
        Activity(
            id=2,
            teacher="Maria",
            subject="Color",
            group="2A",
            room="A1",
            day="Monday",
            start="08:00",
            duration=2,
        )
    )

    engine = SchedulerEngine()

    conflicts = engine.validate(schedule)

    assert any(c.type == "room_conflict" for c in conflicts)