"""
Configuration module for RiPi scraper.
Loads environment variables and provides application settings.
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8001
    ENVIRONMENT: str = "production"
    DEBUG: bool = False
    
    # Request Configuration
    USER_AGENT: str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    REQUEST_TIMEOUT: int = 30
    MAX_RETRIES: int = 3
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/ripi_scraper.log"
    
    # Supabase (loaded from .env)
    SUPABASE_URL: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None
    
    class Config:
        env_file = "../.env"
        case_sensitive = True


settings = Settings()

    USE_PROXY: bool = False
    PROXY_URL: Optional[str] = None
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Global settings instance
settings = Settings()
