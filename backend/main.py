from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.teachers import router as teachers_router
from routes.activities import router as activities_router
from routes.scheduler import router as scheduler_router
from routes.scheduler_live import router as scheduler_live_router
from routes.requirements import router as requirements_router
from routes.schedule_explanations import router as schedule_explanations_router


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
app.include_router(scheduler_router)
app.include_router(scheduler_live_router)
app.include_router(requirements_router)
app.include_router(schedule_explanations_router)


@app.get("/")
def root():
    return {"missatge": "EMAD Scheduler funciona!"}