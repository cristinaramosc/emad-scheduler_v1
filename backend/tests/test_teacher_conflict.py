from scheduler_engine.engine import SchedulerEngine

def test_teacher_without_conflicts():
    engine = SchedulerEngine()

    # De moment només comprovem que validate existeix
    conflicts = engine.validate(None)

    assert isinstance(conflicts, list)