from fastapi import APIRouter, Depends
from src.auth.jwt import get_current_user

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    u = dict(user)
    u["id"] = u.pop("_id", None)
    return u
