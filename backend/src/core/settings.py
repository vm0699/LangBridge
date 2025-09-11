from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    MONGODB_URI: str = "mongodb://localhost:27017/langbridge"
    JWT_SECRET: str = "dev-secret"
    JWT_EXPIRES_MIN: int = 1440
    ALLOW_ORIGINS: str = "*"   # comma-separated or '*'

    @property
    def allow_origins_list(self) -> List[str]:
        raw = (self.ALLOW_ORIGINS or "*").strip()
        if raw == "*":
            return ["*"]
        return [o.strip() for o in raw.split(",") if o.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
