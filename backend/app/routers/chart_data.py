from fastapi import APIRouter, Query

from app.services import psychrometrics

router = APIRouter()


@router.get("/chart/base-data")
def get_base_chart_data(pressure_pa: float = Query(default=101325.0, ge=54000, le=108500)):
    return psychrometrics.get_base_chart_data(pressure_pa=pressure_pa)
