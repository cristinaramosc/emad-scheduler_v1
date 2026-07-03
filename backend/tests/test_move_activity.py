from scheduler_engine.engine import SchedulerEngine
from scheduler_engine.models import Schedule, Activity


def make_schedule():
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

    return schedule


def test_move_activity_updates_day_and_start():
    engine = SchedulerEngine()
    engine.load(make_schedule())

    activity = engine.move_activity(
        1,
        day="Tuesday",
        start="10:00",
    )

    assert activity is not None
    assert activity.day == "Tuesday"
    assert activity.start == "10:00"


def test_move_activity_returns_none_when_activity_does_not_exist():
    engine = SchedulerEngine()
    engine.load(make_schedule())

    activity = engine.move_activity(
        999,
        day="Tuesday",
        start="10:00",
    )

    assert activity is None
