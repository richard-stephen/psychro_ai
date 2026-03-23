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
