from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_FILE = Path(__file__).resolve().parents[2] / ".env"
DEFAULT_CORS_ORIGINS = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


class Settings(BaseSettings):
    app_name: str = "Cabana da Pizza API"
    app_env: str = "development"
    app_host: str = "127.0.0.1"
    app_port: int = 8000
    api_v1_prefix: str = "/api"
    database_url: str = "postgresql+psycopg://postgres:postgres@127.0.0.1:5432/cabana_pizza"
    database_connect_timeout: int = 3
    cors_origins: str = ",".join(DEFAULT_CORS_ORIGINS)
    cors_origin_regex: str | None = None
    auth_secret_key: str = "dev-only-change-me-with-at-least-32-chars"
    auth_algorithm: str = "HS256"
    auth_access_token_expire_minutes: int = 480
    admin_bootstrap_name: str = ""
    admin_bootstrap_email: str = ""
    admin_bootstrap_password: str = ""
    admin_order_undo_window_minutes: int = 10
    media_root: str = str(Path(__file__).resolve().parents[2] / "media")
    media_url_prefix: str = "/media"
    media_max_upload_mb: int = 5

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def normalize_cors_origins(cls, value: object) -> object:
        if isinstance(value, list):
            return ",".join(str(item).strip() for item in value if str(item).strip())
        return value

    @property
    def cors_origins_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]

    @property
    def resolved_cors_origin_regex(self) -> str | None:
        if self.cors_origin_regex:
            return self.cors_origin_regex

        if self.app_env.lower() != "development":
            return None

        return (
            r"^http://("
            r"localhost|127\.0\.0\.1|"
            r"10\.\d{1,3}\.\d{1,3}\.\d{1,3}|"
            r"192\.168\.\d{1,3}\.\d{1,3}|"
            r"172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}"
            r"):\d+$"
        )

    @property
    def media_root_path(self) -> Path:
        return Path(self.media_root).resolve()


@lru_cache
def get_settings() -> Settings:
    return Settings()
