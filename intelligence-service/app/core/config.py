from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "FraudLens AI Intelligence Service"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    DEBUG: bool = True
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5000",
        "http://localhost:5173",
        "http://127.0.0.1:5000",
        "http://127.0.0.1:5173",
    ]
    
    # Optional Gemini API Key for Grounded GenAI Case Summary
    GEMINI_API_KEY: str = ""

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="ignore")

settings = Settings()
