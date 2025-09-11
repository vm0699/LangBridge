import logging
from urllib.parse import urlparse

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

from src.core.settings import get_settings
from src.routers import auth as auth_router
from src.routers import users as users_router
from src.routers import contacts as contacts_router
from src.routers import settings as settings_router
from src.routers import chats as chats_router
from src.routers import otp as otp_router  # <-- NEW: Twilio Verify endpoints

settings = get_settings()
logger = logging.getLogger("uvicorn.error")


def _cors_origins():
    # If '*' -> allow any, else use provided list
    if settings.allow_origins_list == ["*"]:
        return ["*"]
    return settings.allow_origins_list


app = FastAPI(title="Chat Backend")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    # ---- MongoDB client
    client = AsyncIOMotorClient(settings.MONGODB_URI)

    # Derive DB name from the URI path; fall back to "chatapp" if none provided
    parsed = urlparse(settings.MONGODB_URI)
    db_name = (parsed.path or "").lstrip("/") or "chatapp"
    db = client[db_name]

    # Expose collections on app.state
    app.state.client = client
    app.state.db = db
    app.state.users = db["users"]
    app.state.contacts = db["contacts"]
    app.state.chats = db["chats"]

    # Startup log (mask secret)
    masked = (settings.JWT_SECRET[:2] + "****") if settings.JWT_SECRET else "****"
    logger.info(
        "Startup: MONGO=%s  DB=%s  JWT_EXPIRES_MIN=%s  JWT_SECRET=%s  CORS=%s",
        settings.MONGODB_URI,
        db_name,
        settings.JWT_EXPIRES_MIN,
        masked,
        _cors_origins(),
    )


@app.on_event("shutdown")
async def on_shutdown():
    client = getattr(app.state, "client", None)
    if client:
        client.close()


# ---- Routers
app.include_router(auth_router.router)
app.include_router(users_router.router)
app.include_router(contacts_router.router)
app.include_router(settings_router.router)
app.include_router(chats_router.router)
app.include_router(otp_router.router)  # <-- NEW: mounts /otp/send and /otp/verify


@app.get("/")
async def health():
    return {"ok": True}
