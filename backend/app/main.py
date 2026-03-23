from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import calculations, chart_data

app = FastAPI(title="Psychro AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chart_data.router, prefix="/api/v1")
app.include_router(calculations.router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok"}
