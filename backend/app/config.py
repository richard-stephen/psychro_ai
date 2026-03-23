from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:5174"]

    class Config:
        env_file = ".env"


settings = Settings()
