"""
Radstation v2 - Main Application
FastAPI Server
"""
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from .config import settings
from .routers import artikel, lieferanten, kategorien, bestellungen, reparaturen, leihraeder, dashboard, kunden, varianten, lagerorte

# FastAPI App
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router einbinden
app.include_router(lagerorte.router)
app.include_router(artikel.router)
app.include_router(varianten.router)  # <- VARIANTEN!
app.include_router(lieferanten.router)  # <- NEU!
app.include_router(kategorien.router)
app.include_router(bestellungen.router)
app.include_router(reparaturen.router)
app.include_router(leihraeder.router)
app.include_router(leihraeder.router_vermietung)
app.include_router(dashboard.router)  # <- Dashboard!
app.include_router(kunden.router)  # <- KUNDENKARTEI!
# Static Files (Uploads)
files_dir = Path(settings.FILES_DIR)
files_dir.mkdir(exist_ok=True)
app.mount("/files", StaticFiles(directory=str(files_dir)), name="files")

# Static Files (Frontend)
static_dir = Path("static")
if static_dir.exists():
    app.mount("/static", StaticFiles(directory="static"), name="static")

# Health Check Endpoints
@app.get("/")
def root():
    """Root Endpoint - Health Check"""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs",
    }

@app.get("/health")
def health_check():
    """Health Check für Monitoring"""
    return {"status": "healthy"}