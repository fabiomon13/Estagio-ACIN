from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    # Only used by backend/tests/conftest.py. Must point at a dedicated test database
    test_database_url: str = ""

    frontend_url: str = "http://localhost:5173"

    jwt_secret_key: str
    device_token_secret: str | None = None
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480
    cookie_secure: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
