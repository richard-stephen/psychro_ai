from typing import Annotated, Literal, Union
from pydantic import BaseModel, Field, model_validator


class PointRequest(BaseModel):
    temperature: float = Field(ge=-10, le=50)
    humidity: float = Field(ge=0, le=100)


class DesignZoneRequest(BaseModel):
    min_temp: float = Field(ge=-10, le=50)
    max_temp: float = Field(ge=-10, le=50)
    min_rh: float = Field(ge=0, le=100)
    max_rh: float = Field(ge=0, le=100)

    @model_validator(mode='after')
    def validate_ranges(self):
        if self.min_temp >= self.max_temp:
            raise ValueError('min_temp must be less than max_temp')
        if self.min_rh >= self.max_rh:
            raise ValueError('min_rh must be less than max_rh')
        return self


class SensibleHeatingCoolingRequest(BaseModel):
    process_type: Literal["sensible_heating_cooling"]
    temperature: float = Field(ge=-10, le=50)
    humidity: float = Field(ge=0, le=100)
    target_temperature: float = Field(ge=-10, le=50)


class CoolingDehumidificationRequest(BaseModel):
    process_type: Literal["cooling_dehumidification"]
    temperature: float = Field(ge=-10, le=50)
    humidity: float = Field(ge=0, le=100)
    adp_temperature: float = Field(ge=-10, le=50)
    bypass_factor: float = Field(gt=0, lt=1)


class EvaporativeCoolingRequest(BaseModel):
    process_type: Literal["evaporative_cooling"]
    temperature: float = Field(ge=-10, le=50)
    humidity: float = Field(ge=0, le=100)
    target_rh: float = Field(gt=0, le=100)


class MixingRequest(BaseModel):
    process_type: Literal["mixing"]
    temperature_1: float = Field(ge=-10, le=50)
    humidity_1: float = Field(ge=0, le=100)
    temperature_2: float = Field(ge=-10, le=50)
    humidity_2: float = Field(ge=0, le=100)
    ratio: float = Field(gt=0, lt=1)


ProcessRequest = Annotated[
    Union[SensibleHeatingCoolingRequest, CoolingDehumidificationRequest, EvaporativeCoolingRequest, MixingRequest],
    Field(discriminator="process_type"),
]
