"""Phase C smoke test — cross-channel visitor identity resolution.

Verifies a person identified in chat (by phone) resolves to the SAME
VisitorProfile when they later message on WhatsApp (keyed by phone), exercising
the alias lookup + identity merge. Creates rows in the test org then cleans up.
"""
import asyncio
import os
import uuid

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+asyncpg://oraone_admin:6301655098@127.0.0.1:15432/oraone",
)

from app.database.session import session_scope  # noqa: E402
from app.database.models.visitor_profile import VisitorProfile  # noqa: E402
from app.services import visitor_service as vs  # noqa: E402

ORG = uuid.UUID("8aba69e1-b3ed-4628-8ad3-554cc692d80b")


async def main() -> None:
    phone = "+1555" + uuid.uuid4().hex[:7]
    cookie = "vis_" + uuid.uuid4().hex[:12]
    created: list[uuid.UUID] = []
    ok = True
    async with session_scope() as db:
        try:
            # 1) Anonymous chat visit (cookie only) — first website touch.
            p_chat = await vs.upsert_profile(
                db, organization_id=ORG, visitor_key=cookie, channel="chat"
            )
            created.append(p_chat.id)
            vs.append_memory(p_chat, channel="chat", role="user",
                             text="I want premium insurance")

            # 2) They identify with their phone in chat.
            p_chat2 = await vs.upsert_profile(
                db, organization_id=ORG, visitor_key=cookie, channel="chat",
                phone=phone, name="Test Caller",
            )
            assert p_chat2.id == p_chat.id, "identify should stay same profile"

            # 3) Next day they message on WHATSAPP — keyed by the normalised phone.
            p_wa = await vs.upsert_profile(
                db, organization_id=ORG,
                visitor_key=vs.normalize_phone(phone), channel="whatsapp",
                phone=phone,
            )
            created.append(p_wa.id)

            same = p_wa.id == p_chat.id
            digest = vs.build_memory_digest(p_wa, current_channel="whatsapp")
            print("chat profile id :", p_chat.id)
            print("whatsapp profile id:", p_wa.id)
            print("SAME identity   :", same)
            print("channels_used   :", p_wa.channels_used)
            print("aliases         :", p_wa.aliases)
            print("--- whatsapp memory digest ---")
            print(digest)
            ok = same and digest and "premium insurance" in digest
        finally:
            # Cleanup every profile we created/merged.
            for pid in set(created):
                row = await db.get(VisitorProfile, pid)
                if row is not None:
                    await db.delete(row)
            # Also delete any merged-survivor by phone just in case.
            from sqlalchemy import select
            extra = await db.scalar(
                select(VisitorProfile)
                .where(VisitorProfile.organization_id == ORG)
                .where(VisitorProfile.phone == vs.normalize_phone(phone))
            )
            if extra is not None:
                await db.delete(extra)
            await db.commit()

    print("\nRESULT:", "PASS" if ok else "FAIL")


if __name__ == "__main__":
    asyncio.run(main())
