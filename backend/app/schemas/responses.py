from pydantic import BaseModel


class PointResult(BaseModel):
    temperature: float
    relative_humidity: float
    humidity_ratio: float
    enthalpy: float


class DataPoint(BaseModel):
    temperature: float
    humidity_ratio: float


class DatasetResult(BaseModel):
    points: list[DataPoint]
    total_rows: int
    valid_rows: int
    invalid_rows: int


class Polygon(BaseModel):
    x: list[float]
    y: list[float]


class DesignZoneResult(BaseModel):
    polygon: Polygon


class ProcessPoint(BaseModel):
    temperature: float
    relative_humidity: float
    humidity_ratio: float
    enthalpy: float


class ProcessResult(BaseModel):
    process_type: str
    start_point: ProcessPoint
    end_point: ProcessPoint
    mix_point: ProcessPoint | None = None
    line_temperatures: list[float]
    line_humidity_ratios: list[float]
    delta_enthalpy: float
    sensible_heat_ratio: float | None
