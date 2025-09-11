from datetime import datetime
from fastapi import APIRouter, Request, Depends
from src.auth.jwt import get_current_user

router = APIRouter(prefix="/chats", tags=["chats"])

@router.get("/recent")
async def recent_chats(
    request: Request,
    user: dict = Depends(get_current_user),
):
    chats = request.app.state.chats
    uid = user["_id"]

    if await chats.count_documents({"members": uid}) == 0:
        await chats.insert_one({
            "members": [uid, "user_999"],
            "room": "general",
            "lastMessage": {"text": "Hey there 👋", "at": datetime.utcnow().isoformat()},
        })

    items = []
    async for c in chats.find({"members": uid}).sort([("_id", -1)]).limit(20):
        items.append({
            "room": c.get("room", "general"),
            "lastMessage": c.get("lastMessage"),
            "members": c.get("members", []),
        })
    return {"items": items}
