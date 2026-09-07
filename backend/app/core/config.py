from functools import lru_cache

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="MARKETMIND_",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "MarketMind API"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "sqlite:///./marketmind.db"
    jwt_secret: SecretStr = SecretStr("development-only-secret-change-before-deploy")
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 15
    refresh_token_days: int = 14
    reauth_token_minutes: int = 5
    security_token_minutes: int = 30
    session_idle_minutes: int = 30
    password_min_length: int = 12
    max_login_failures: int = 5
    account_lock_minutes: int = 15
    rate_limit_enabled: bool = True
    rate_limit_auth_per_minute: int = 15
    rate_limit_auth_ip_per_minute: int = 30
    rate_limit_public_per_minute: int = 60
    rate_limit_authenticated_per_minute: int = 300
    auth_backoff_base_seconds: int = 2
    auth_backoff_max_seconds: int = 300
    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
    )
    expose_development_tokens: bool = True
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: SecretStr | None = None
    smtp_from_email: str | None = None
    smtp_starttls: bool = True
    resend_api_key: SecretStr | None = None
    resend_from_email: str = "onboarding@resend.dev"
    initial_admin_email: str | None = None
    initial_admin_password: SecretStr | None = None

    @field_validator("database_url", mode="before")
    @classmethod
    def sanitize_database_url(cls, value: str | None) -> str:
        if not value:
            return "sqlite:///./marketmind.db"
        # Support postgres:// prefix by normalizing to postgresql:// for SQLAlchemy
        if value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql://", 1)
        return value

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: list[str] | str) -> list[str]:
        if isinstance(value, str):
            if value.strip() == "*":
                return ["*"]
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @field_validator("jwt_secret")
    @classmethod
    def validate_jwt_secret(cls, value: SecretStr) -> SecretStr:
        if len(value.get_secret_value()) < 32:
            raise ValueError("JWT secret must contain at least 32 characters")
        return value

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
