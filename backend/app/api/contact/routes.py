from datetime import datetime, timezone
from typing import Any, Optional
import uuid

from pydantic import BaseModel, EmailStr


class ContactIn(BaseModel):
    name: str
    email: EmailStr
    company: Optional[str] = None
    message: str
    type: Optional[str] = "contact"  # contact | demo | sales


class NewsletterIn(BaseModel):
    email: EmailStr


def register_contact_routes(api, db: Any) -> None:
    @api.post("/contact")
    async def submit_contact(payload: ContactIn):
        doc = {
            "id": str(uuid.uuid4()),
            "created_at": datetime.now(timezone.utc).isoformat(),
            **payload.model_dump(),
        }
        await db.contact_submissions.insert_one(doc)
        doc.pop("_id", None)
        return {"message": "Thanks! We'll be in touch shortly.", "id": doc["id"]}

    @api.post("/newsletter")
    async def subscribe_newsletter(payload: NewsletterIn):
        await db.newsletter.update_one(
            {"email": payload.email.lower()},
            {
                "$set": {
                    "email": payload.email.lower(),
                    "subscribed_at": datetime.now(timezone.utc).isoformat(),
                }
            },
            upsert=True,
        )
        return {"message": "Subscribed successfully"}
