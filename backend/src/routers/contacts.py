from fastapi import APIRouter, Depends
from pydantic import BaseModel

router = APIRouter(prefix="/contacts", tags=["Contacts"])

class SyncBody(BaseModel):
    numbers: list[str]

@router.post("/sync")
async def sync_contacts(body: SyncBody):
    # Check your Mongo users collection
    users = await app.state.users.find({"phoneNumber": {"$in": body.numbers}}).to_list(length=100)
    return users
