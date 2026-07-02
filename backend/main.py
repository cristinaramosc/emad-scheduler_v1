from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import SessionLocal
from models.teacher import Teacher

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def inici():
    return {"missatge": "EMAD Scheduler funciona!"}


@app.get("/teachers")
def get_teachers():
    db = SessionLocal()

    teachers = db.query(Teacher).order_by(Teacher.name).all()

    resultat = [
        {
            "id": teacher.id,
            "name": teacher.name,
        }
        for teacher in teachers
    ]

    db.close()

    return resultat


@app.get("/activities")
def get_activities(teacher_id: int):

    return [
        {
            "id": 1,
            "subject": "Dibuix",
            "group": "GM1",
            "room": "Aula 1",
            "day": "Dilluns",
            "start": "8:00",
            "end": "10:00",
        },
        {
            "id": 2,
            "subject": "Projectes",
            "group": "GM2",
            "room": "Taller",
            "day": "Dimecres",
            "start": "15:00",
            "end": "17:00",
        },
    ]