import pandas as pd
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional
import io

from app.schemas.requests import PointRequest, DesignZoneRequest, ProcessRequest
from app.schemas.responses import PointResult, DataPoint, DatasetResult, DesignZoneResult, Polygon, ProcessResult
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
def calculate_dataset(
    file: UploadFile = File(...),
    temp_column: Optional[str] = Form(None),
    humidity_column: Optional[str] = Form(None),
):
    filename = file.filename or ""
    if not (filename.endswith(".xlsx") or filename.endswith(".csv")):
        raise HTTPException(status_code=400, detail="File must be a .xlsx or .csv file.")

    contents = file.file.read()
    try:
        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read file. Ensure it is a valid .xlsx or .csv.")

    if len(df.columns) < 2:
        raise HTTPException(status_code=400, detail="File must contain at least two columns.")

    # Resolve which columns to use
    if temp_column and humidity_column:
        # Explicit mapping provided by the user
        missing = [c for c in (temp_column, humidity_column) if c not in df.columns]
        if missing:
            raise HTTPException(status_code=400, detail=f"Column(s) not found in file: {', '.join(missing)}")
        t_col, rh_col = temp_column, humidity_column
    elif "Temperature" in df.columns and "Humidity" in df.columns:
        t_col, rh_col = "Temperature", "Humidity"
    else:
        # Cannot determine columns — ask the frontend to let the user map them
        raise HTTPException(
            status_code=422,
            detail={
                "code": "column_mapping_required",
                "columns": df.columns.tolist(),
            },
        )

    total_rows = len(df)
    T_series = pd.to_numeric(df[t_col], errors="coerce")
    RH_series = pd.to_numeric(df[rh_col], errors="coerce")
    valid_mask = (
        T_series.notna() & RH_series.notna()
        & (T_series >= -10) & (T_series <= 50)
        & (RH_series >= 0) & (RH_series <= 100)
    )
    T_arr = T_series[valid_mask].to_numpy()
    RH_arr = RH_series[valid_mask].to_numpy()

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


@router.post("/calculate/process", response_model=ProcessResult)
def calculate_process(request: ProcessRequest):
    try:
        if request.process_type == "sensible_heating_cooling":
            result = psychrometrics.calc_sensible_heating_cooling(
                request.temperature, request.humidity, request.target_temperature
            )
        elif request.process_type == "cooling_dehumidification":
            result = psychrometrics.calc_cooling_dehumidification(
                request.temperature, request.humidity, request.adp_temperature, request.bypass_factor
            )
        elif request.process_type == "evaporative_cooling":
            result = psychrometrics.calc_evaporative_cooling(
                request.temperature, request.humidity, request.target_rh
            )
        elif request.process_type == "mixing":
            result = psychrometrics.calc_mixing(
                request.temperature_1, request.humidity_1,
                request.temperature_2, request.humidity_2,
                request.ratio,
            )
        else:
            raise HTTPException(status_code=400, detail=f"Unknown process type: {request.process_type}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return result
