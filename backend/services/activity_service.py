from database import SessionLocal
from models.teacher import Teacher
from models.activity import Activity


def get_teacher_activities(teacher_id):

    db = SessionLocal()

    teacher = (
        db.query(Teacher)
        .filter(Teacher.id == teacher_id)
        .first()
    )

    if teacher is None:
        db.close()
        return []

    activities = (
        db.query(Activity)
        .filter(Activity.teacher == teacher.name)
        .all()
    )

    resultat = []

    for a in activities:

        resultat.append(
            {
                "id": a.id,
                "subject": a.subject,
                "group": a.group_name,
                "room": a.room,
                "day": a.day,
                "start": a.start,
                "duration": a.duration,
            }
        )

    db.close()

    return resultat