import pandas as pd
from fastapi import APIRouter, HTTPException, UploadFile, File
import io

from app.schemas.requests import PointRequest, DesignZoneRequest
from app.schemas.responses import PointResult, DataPoint, DatasetResult, DesignZoneResult, Polygon
from app.services import psychrometrics

router = APIRouter()


@router.post("/calculate/point", response_model=PointResult)
def calculate_point(request: PointRequest):
    W = psychrometrics.calc_humidity_ratio(request.temperature, request.humidity)
    if W is None:
        raise HTTPException(status_code=400, detail="Could not compute humidity ratio for given inputs.")

    h = psychrometrics.calc_enthalpy(request.temperature, W)
    if h is None:
        raise HTTPException(status_code=400, detail="Could not compute enthalpy for given inputs.")

    return PointResult(
        temperature=request.temperature,
        relative_humidity=request.humidity,
        humidity_ratio=round(W, 4),
        enthalpy=round(h, 4),
    )


@router.post("/calculate/dataset", response_model=DatasetResult)
def calculate_dataset(file: UploadFile = File(...)):
    if not file.filename.endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="File must be a .xlsx Excel file.")

    contents = file.file.read()
    try:
        df = pd.read_excel(io.BytesIO(contents))
    except (ValueError, KeyError):
        raise HTTPException(status_code=400, detail="Could not read Excel file.")

    if "Temperature" not in df.columns or "Humidity" not in df.columns:
        raise HTTPException(
            status_code=400,
            detail="Excel file must contain 'Temperature' (°C) and 'Humidity' (%) columns",
        )

    df = df[["Temperature", "Humidity"]]
    total_rows = len(df)

    df["Temperature"] = pd.to_numeric(df["Temperature"], errors="coerce")
    df["Humidity"] = pd.to_numeric(df["Humidity"], errors="coerce")
    df_valid = df.dropna()
    valid_rows = len(df_valid)
    invalid_rows = total_rows - valid_rows

    T_arr = df_valid["Temperature"].to_numpy()
    RH_arr = df_valid["Humidity"].to_numpy()
    W_arr, mask = psychrometrics.calc_humidity_ratios_vectorized(T_arr, RH_arr)

    points = [
        DataPoint(temperature=round(float(T_arr[i]), 4), humidity_ratio=round(float(W_arr[i]), 4))
        for i in range(len(T_arr))
        if mask[i]
    ]
    valid_rows = len(points)
    invalid_rows = total_rows - valid_rows

    return DatasetResult(
        points=points,
        total_rows=total_rows,
        valid_rows=valid_rows,
        invalid_rows=invalid_rows,
    )


@router.post("/calculate/design-zone", response_model=DesignZoneResult)
def calculate_design_zone(request: DesignZoneRequest):
    polygon = psychrometrics.compute_design_zone_polygon(
        request.min_temp, request.max_temp, request.min_rh, request.max_rh
    )
    return DesignZoneResult(polygon=Polygon(x=polygon["x"], y=polygon["y"]))
