from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import SessionLocal
from models.teacher import Teacher
from models.activity import Activity

app = FastAPI()

# 🔓 CORS (perquè React pugui parlar amb FastAPI)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------
# TEST
# --------------------
@app.get("/")
def root():
    return {"missatge": "EMAD Scheduler funciona!"}


@app.get("/hola")
def hola():
    return {"hola": "Cristina"}


# --------------------
# TEACHERS
# --------------------
@app.get("/teachers")
def get_teachers():
    db = SessionLocal()

    teachers = db.query(Teacher).order_by(Teacher.name).all()

    resultat = [
        {
            "id": t.id,
            "name": t.name,
        }
        for t in teachers
    ]

    db.close()
    return resultat


# --------------------
# ACTIVITIES
# --------------------
@app.get("/activities")
def get_activities(teacher_id: int):

    db = SessionLocal()

    # obtenim nom del professor
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()

    if not teacher:
        db.close()
        return []

    activities = db.query(Activity).filter(
        Activity.teacher == teacher.name
    ).all()

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
                "end": a.start,  # provisional (després ho millorarem)
            }
        )

    db.close()
    return resultat