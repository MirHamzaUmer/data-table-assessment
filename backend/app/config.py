from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    POSTGRES_HOST: str = "postgres"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "appdb"
    POSTGRES_USER: str = "appuser"
    POSTGRES_PASSWORD: str = "apppassword"

    DATABASE_URL: str = "postgresql+asyncpg://appuser:apppassword@postgres:5432/appdb"
    REDIS_URL: str = "redis://redis:6379"


settings = Settings()
