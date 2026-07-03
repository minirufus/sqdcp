from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import auth, departments, boards, events, reports

Base.metadata.create_all(bind=engine)

app = FastAPI(title="TBP - Command Dashboard")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(departments.router)
app.include_router(boards.router)
app.include_router(events.router)
app.include_router(reports.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
