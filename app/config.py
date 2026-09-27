from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "development"
    app_name: str = "doubt"
    log_level: str = "INFO"

    host: str = "0.0.0.0"
    port: int = 8000

    database_url: str = "postgresql+asyncpg://postgres:password@localhost:5432/doubt"
    redis_url: str = "redis://localhost:6379/0"

    helius_api_key: str = ""
    helius_rpc_url: str = ""
    helius_webhook_secret: str = ""

    birdeye_api_key: str = ""

    telegram_bot_token: str = ""

    verdict_rate_limit_per_min: int = 60
    bot_rate_limit_per_chat_per_min: int = 10

    # Scoring defaults / safety
    min_liquidity_usd: float = 5000.0
    verdict_ttl_seconds: int = 30


@lru_cache
def get_settings() -> Settings:
    return Settings()
