from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.teachers import router as teachers_router
from routes.activities import router as activities_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(teachers_router)
app.include_router(activities_router)

@app.get("/")
def root():
    return {"missatge": "EMAD Scheduler funciona!"}


@app.get("/hola")
def hola():
    return {"hola": "Cristina"}