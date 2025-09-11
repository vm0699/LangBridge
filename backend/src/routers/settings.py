from fastapi import APIRouter, Request, Depends
from pydantic import BaseModel
from typing import List
from src.auth.jwt import get_current_user

router = APIRouter(prefix="/settings", tags=["settings"])

class SettingsPayload(BaseModel):
    preferredLanguages: List[str]
    showOriginal: bool

@router.post("")
async def update_settings(
    payload: SettingsPayload,
    request: Request,
    user: dict = Depends(get_current_user),
):
    users = request.app.state.users
    await users.update_one(
        {"_id": user["_id"]},
        {"$set": {"prefs": {"langs": payload.preferredLanguages, "showOriginal": payload.showOriginal}}},
    )
    return {"ok": True}
