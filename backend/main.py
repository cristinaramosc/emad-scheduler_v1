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


@app.get("/hola")
def hola():
    return {"hola": "Cristina"}


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