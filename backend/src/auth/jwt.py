from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from fastapi import Header, HTTPException, Request
from jose import jwt, JWTError

from src.core.settings import get_settings

settings = get_settings()
ALGORITHM = "HS256"


def create_access_token(sub: str) -> str:
    now = datetime.utcnow()
    payload = {
        "sub": sub,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=settings.JWT_EXPIRES_MIN)).timestamp()),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=ALGORITHM)


def decode_token(token: str) -> Dict[str, Any]:
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])


async def get_current_user(
    request: Request, authorization: Optional[str] = Header(None)
) -> Dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = decode_token(token)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    uid = payload.get("sub")
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    users = request.app.state.users
    user = await users.find_one({"_id": uid})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user
