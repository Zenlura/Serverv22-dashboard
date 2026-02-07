"""
Radstation v2 - Configuration
Pydantic Settings für Environment Variables
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


class Settings(BaseSettings):
    """Application Settings"""
    
    # App
    APP_NAME: str = "Radstation Warenwirtschaft"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:radstation@localhost:5432/radstation"
    
    # Files
    FILES_DIR: str = "files"  # Als String, konvertieren zu Path via Property
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: str = "jpg,jpeg,png,pdf"  # Als String statt set!
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 5000
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    # === HELPER PROPERTIES ===
    
    @property
    def files_path(self) -> Path:
        """FILES_DIR als Path-Objekt"""
        return Path(self.FILES_DIR).resolve()
    
    @property
    def allowed_extensions_set(self) -> set[str]:
        """ALLOWED_EXTENSIONS als Set mit Punkten (z.B. {'.jpg', '.png'})"""
        extensions = [ext.strip() for ext in self.ALLOWED_EXTENSIONS.split(",")]
        return {f".{ext}" if not ext.startswith(".") else ext for ext in extensions}
    
    @property
    def allowed_extensions_list(self) -> list[str]:
        """ALLOWED_EXTENSIONS als Liste"""
        return list(self.allowed_extensions_set)
    
    def is_allowed_extension(self, filename: str) -> bool:
        """Prüft ob Dateiendung erlaubt ist"""
        ext = Path(filename).suffix.lower()
        return ext in self.allowed_extensions_set


# Global Settings Instance
settings = Settings()