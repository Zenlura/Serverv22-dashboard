"""
Database Configuration & Session Management
SQLAlchemy setup for PostgreSQL
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import settings

# SQLAlchemy Engine
engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,  # SQL-Queries loggen im Debug-Modus
    pool_pre_ping=True,   # Connection-Check vor Verwendung
    pool_size=5,          # Connection-Pool Größe
    max_overflow=10       # Max zusätzliche Connections
)

# Session Factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base Class für Models
Base = declarative_base()


# Dependency für FastAPI
def get_db():
    """
    FastAPI Dependency für DB-Sessions.
    
    Yields:
        Session: SQLAlchemy Session
        
    Usage:
        @app.get("/items")
        def get_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
