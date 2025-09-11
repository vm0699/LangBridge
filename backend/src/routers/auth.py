from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Dict

from src.auth.jwt import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])

# Dev-only in-memory OTP store
OTP_STORE: Dict[str, str] = {}


class PhoneReq(BaseModel):
    phone: str


class OtpVerify(BaseModel):
    phone: str
    otp: str


@router.post("/otp/request")
async def otp_request(payload: PhoneReq):
    # In dev, always set 123456
    OTP_STORE[payload.phone] = "123456"
    return {"sent": True, "otp_hint": "123456 (dev)"}


@router.post("/otp/verify")
async def otp_verify(payload: OtpVerify, request: Request):
    if OTP_STORE.get(payload.phone) != payload.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    users = request.app.state.users
    uid = payload.phone  # use phone as unique id for dev

    # Upsert user
    await users.update_one(
        {"_id": uid},
        {
            "$setOnInsert": {
                "_id": uid,
                "phone": payload.phone,
                "name": None,
                "prefs": {"langs": ["en"], "showOriginal": True},
            }
        },
        upsert=True,
    )

    token = create_access_token(uid)
    return {"token": token}
