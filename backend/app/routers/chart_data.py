from fastapi import APIRouter

from app.services import psychrometrics

router = APIRouter()


@router.get("/chart/base-data")
def get_base_chart_data():
    return psychrometrics.get_base_chart_data()
