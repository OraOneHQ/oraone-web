"""Phase M smoke test — omnichannel unified pipeline + cross-channel identity.

Proves that two different messaging channels (WhatsApp then SMS) from the SAME
phone number resolve to ONE VisitorProfile, each thread into their own
Conversation, and that memory accumulates across channels — all through the
single omnichannel_service.handle_inbound path. Creates rows then cleans up.
"""
import asyncio
import os
import uuid

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+asyncpg://oraone_admin:6301655098@127.0.0.1:15432/oraone",
)

from sqlalchemy import select  # noqa: E402

from app.database.session import session_scope  # noqa: E402
from app.database.models.agent import Agent, AgentStatus  # noqa: E402
from app.database.models.conversation import Conversation  # noqa: E402
from app.database.models.message import Message  # noqa: E402
from app.database.models.visitor_profile import VisitorProfile  # noqa: E402
from app.services import omnichannel_service as omni  # noqa: E402
from app.services import visitor_service as vs  # noqa: E402

ORG = uuid.UUID("8aba69e1-b3ed-4628-8ad3-554cc692d80b")


async def main() -> None:
    phone = "+1555" + uuid.uuid4().hex[:7]
    ok = True
    convo_ids: list[uuid.UUID] = []
    profile_id = None
    async with session_scope() as db:
        agent = await db.scalar(
            select(Agent)
            .where(Agent.organization_id == ORG)
            .where(Agent.status == AgentStatus.active)
            .limit(1)
        )
        if agent is None:
            print("NO ACTIVE AGENT — cannot run")
            return
        print("agent:", agent.id, agent.name)
        try:
            # 1) Inbound WhatsApp.
            r1 = await omni.handle_inbound(db, omni.InboundMessage(
                channel="whatsapp", organization_id=ORG, agent_id=agent.id,
                project_id=agent.project_id, text="Hi, what are your pricing plans?",
                phone=phone, name="Omni Tester",
            ))
            convo_ids.append(r1.conversation_id)
            await db.flush()

            # 2) Same person switches to SMS (same phone).
            r2 = await omni.handle_inbound(db, omni.InboundMessage(
                channel="sms", organization_id=ORG, agent_id=agent.id,
                project_id=agent.project_id, text="Actually, do you offer a free trial?",
                phone=phone,
            ))
            convo_ids.append(r2.conversation_id)
            await db.flush()

            # One profile resolved by phone for BOTH channels.
            profile = await vs.find_by_identity(db, ORG, phone=phone)
            profile_id = profile.id if profile else None

            wa_conv = await db.get(Conversation, r1.conversation_id)
            sms_conv = await db.get(Conversation, r2.conversation_id)

            same_profile = (
                wa_conv.visitor_profile_id == sms_conv.visitor_profile_id
                == (profile.id if profile else None)
            )
            distinct_threads = r1.conversation_id != r2.conversation_id

            print("whatsapp conversation:", r1.conversation_id, "->", wa_conv.channel.value)
            print("sms conversation     :", r2.conversation_id, "->", sms_conv.channel.value)
            print("ONE profile for both :", same_profile, "(", profile.id if profile else None, ")")
            print("channels_used        :", profile.channels_used if profile else None)
            print("distinct threads     :", distinct_threads)
            print("memory entries       :", len(profile.memory) if profile else 0)
            print("--- WhatsApp reply (truncated) ---")
            print((r1.text or "")[:200])

            ok = bool(
                same_profile
                and distinct_threads
                and profile
                and "whatsapp" in (profile.channels_used or [])
                and "sms" in (profile.channels_used or [])
                and len(profile.memory) >= 4  # 2 msgs x (user+assistant)
            )
        finally:
            # Cleanup messages, conversations, profile.
            for cid in [c for c in convo_ids if c]:
                msgs = (await db.scalars(
                    select(Message).where(Message.conversation_id == cid)
                )).all()
                for m in msgs:
                    await db.delete(m)
                conv = await db.get(Conversation, cid)
                if conv is not None:
                    await db.delete(conv)
            await db.flush()
            if profile_id is not None:
                prof = await db.get(VisitorProfile, profile_id)
                if prof is not None:
                    await db.delete(prof)
            await db.commit()

    print("\nRESULT:", "PASS" if ok else "FAIL")


if __name__ == "__main__":
    asyncio.run(main())
