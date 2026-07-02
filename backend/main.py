from fastapi import FastAPI

from database import SessionLocal
from models.teacher import Teacher

app = FastAPI()


@app.get("/")
def inici():
    return {"missatge": "EMAD Scheduler funciona!"}


@app.get("/hola")
def hola():
    return {"hola": "Cristina"}


@app.get("/teachers")
def get_teachers():
    db = SessionLocal()

    teachers = db.query(Teacher).order_by(Teacher.name).all()

    resultat = []

    for teacher in teachers:
        resultat.append(
            {
                "id": teacher.id,
                "name": teacher.name,
            }
        )

    db.close()

    return resultat