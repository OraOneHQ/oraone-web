"""AI Campaign Optimization (Product 2 #14).

Analyses a campaign's placed calls + contact queue and returns concrete,
deterministic recommendations: the best hours to dial, answer/conversion
rates, retry effectiveness and plain-language tips. Heuristic (no external
model call) so it is fast, free and testable end-to-end.
"""
from __future__ import annotations

from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models.voice import (
    CampaignContactStatus,
    VoiceCall,
    VoiceCampaign,
    VoiceCampaignContact,
)

# Statuses that mean the call was actually answered/connected.
_ANSWERED = {"completed", "in_progress"}
_POSITIVE_SENTIMENT = {"positive", "very_positive"}
_CONVERTED_RESOLUTION = {"ai_resolved", "converted", "booked", "paid"}


async def optimize_campaign(db: AsyncSession, campaign: VoiceCampaign) -> dict:
    """Return an optimization report for a single campaign."""
    calls = list(
        (await db.scalars(
            select(VoiceCall).where(VoiceCall.campaign_id == campaign.id)
        )).all()
    )
    contacts = list(
        (await db.scalars(
            select(VoiceCampaignContact).where(
                VoiceCampaignContact.campaign_id == campaign.id
            )
        )).all()
    )

    total_calls = len(calls)
    answered = [c for c in calls if (c.answered_at is not None) or (c.status in _ANSWERED)]
    answered_count = len(answered)
    answer_rate = round(answered_count / total_calls * 100, 1) if total_calls else 0.0

    converted = [
        c for c in answered
        if (c.resolution in _CONVERTED_RESOLUTION) or (c.sentiment in _POSITIVE_SENTIMENT)
    ]
    conversion_rate = round(len(converted) / answered_count * 100, 1) if answered_count else 0.0

    durations = [c.duration_seconds for c in answered if c.duration_seconds]
    avg_duration = round(sum(durations) / len(durations), 1) if durations else 0.0

    total_cost = round(sum(c.cost or 0 for c in calls), 2)
    cost_per_answer = round(total_cost / answered_count, 4) if answered_count else 0.0

    # Best hours: answer rate by hour-of-day of the dial time.
    by_hour_total: dict[int, int] = defaultdict(int)
    by_hour_answered: dict[int, int] = defaultdict(int)
    for c in calls:
        if not c.started_at:
            continue
        hour = c.started_at.hour
        by_hour_total[hour] += 1
        if (c.answered_at is not None) or (c.status in _ANSWERED):
            by_hour_answered[hour] += 1
    hour_stats = [
        {
            "hour": h,
            "calls": by_hour_total[h],
            "answered": by_hour_answered[h],
            "answer_rate": round(by_hour_answered[h] / by_hour_total[h] * 100, 1),
        }
        for h in sorted(by_hour_total)
        if by_hour_total[h] >= 1
    ]
    best_hours = sorted(
        hour_stats, key=lambda x: (x["answer_rate"], x["calls"]), reverse=True
    )[:3]

    # Contact-queue health.
    status_counts: dict[str, int] = defaultdict(int)
    for ct in contacts:
        status_counts[ct.status] += 1
    no_answer = status_counts.get(CampaignContactStatus.no_answer, 0)
    failed = status_counts.get(CampaignContactStatus.failed, 0)
    skipped = status_counts.get(CampaignContactStatus.skipped, 0)
    pending = status_counts.get(CampaignContactStatus.pending, 0)
    retryable = sum(1 for ct in contacts if ct.attempts >= 1 and ct.status in (
        CampaignContactStatus.no_answer, CampaignContactStatus.failed,
    ))

    # ── Plain-language recommendations ──
    tips: list[str] = []
    if total_calls == 0:
        tips.append("No calls placed yet — start the campaign to gather optimization data.")
    else:
        if best_hours:
            top = best_hours[0]
            tips.append(
                f"Calls placed around {top['hour']:02d}:00 answer best "
                f"({top['answer_rate']}%). Schedule more dials in this window."
            )
        if answer_rate < 40 and total_calls >= 10:
            tips.append(
                f"Answer rate is low ({answer_rate}%). Try a verified caller ID and "
                "avoid dialing during off-hours to improve pickups."
            )
        if conversion_rate < 20 and answered_count >= 10:
            tips.append(
                f"Conversion is {conversion_rate}%. Tighten the opening script and "
                "front-load the value proposition in the first 10 seconds."
            )
        if avg_duration and avg_duration < 20:
            tips.append(
                f"Average answered call is only {avg_duration}s — callers are dropping "
                "early. Make the greeting more relevant to reduce hang-ups."
            )
        if retryable and campaign.max_attempts <= 2:
            tips.append(
                f"{retryable} contacts failed/no-answer. Increasing max attempts to 3 "
                "typically recovers 15–25% more connects."
            )
        if skipped:
            tips.append(
                f"{skipped} contacts were skipped by the Do-Not-Call list — clean these "
                "from your source list to keep counts accurate."
            )
        if not tips:
            tips.append("Campaign performance looks healthy. Keep the current settings.")

    return {
        "campaign_id": str(campaign.id),
        "status": campaign.status,
        "metrics": {
            "total_calls": total_calls,
            "answered": answered_count,
            "answer_rate": answer_rate,
            "converted": len(converted),
            "conversion_rate": conversion_rate,
            "avg_duration_seconds": avg_duration,
            "total_cost": total_cost,
            "cost_per_answer": cost_per_answer,
        },
        "best_hours": best_hours,
        "hour_breakdown": hour_stats,
        "contact_status": dict(status_counts),
        "queue": {
            "pending": pending,
            "no_answer": no_answer,
            "failed": failed,
            "skipped": skipped,
            "retryable": retryable,
        },
        "recommendations": tips,
    }
