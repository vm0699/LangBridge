import os
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from twilio.rest import Client
from jose import jwt
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/otp", tags=["OTP"])

# Logger
logger = logging.getLogger("uvicorn.error")

# Env values
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_VERIFY_SID = os.getenv("TWILIO_VERIFY_SID")
JWT_SECRET = os.getenv("JWT_SECRET", "change_me")
JWT_ALG = os.getenv("JWT_ALG", "HS256")

client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

# Request bodies
class PhoneBody(BaseModel):
    phoneNumber: str   # must be in E.164 format e.g. +9198xxxxxx

class VerifyBody(BaseModel):
    phoneNumber: str
    otp: str

@router.post("/send")
def send_otp(body: PhoneBody):
    try:
        logger.info(f"[OTP] Sending OTP to {body.phoneNumber}")
        response = client.verify.v2.services(TWILIO_VERIFY_SID).verifications.create(
            to=body.phoneNumber,
            channel="sms",
        )
        logger.info(f"[OTP] Twilio response: sid={response.sid}, status={response.status}")
        return {"status": "sent"}
    except Exception as e:
        logger.exception(f"[OTP] Failed to send OTP to {body.phoneNumber}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/verify")
def verify_otp(body: VerifyBody):
    try:
        logger.info(f"[OTP] Verifying OTP for {body.phoneNumber} with code={body.otp}")
        check = client.verify.v2.services(TWILIO_VERIFY_SID).verification_checks.create(
            to=body.phoneNumber,
            code=body.otp,
        )
        logger.info(f"[OTP] Twilio verification status: {check.status}")

        if check.status != "approved":
            logger.warning(f"[OTP] Invalid OTP for {body.phoneNumber}")
            raise HTTPException(status_code=401, detail="Invalid OTP")

        token = jwt.encode({"sub": body.phoneNumber}, JWT_SECRET, algorithm=JWT_ALG)
        logger.info(f"[OTP] OTP verified. JWT issued for {body.phoneNumber}")
        return {"token": token}
    except Exception as e:
        logger.exception(f"[OTP] Verification failed for {body.phoneNumber}")
        raise HTTPException(status_code=400, detail=str(e))
