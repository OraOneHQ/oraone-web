"""Voice → Workflow trigger engine (Phase 6).

Turns voice-call signals (detected intent, keywords/phrases in the transcript,
sentiment, call lifecycle events) into runs of the existing Product 1 Workflow
Engine. Matching is pure/deterministic (testable); firing reuses the same
``WorkflowRun`` + ``WorkflowRunStep`` machinery as the manual run endpoint and
schedules :func:`app.services.workflow_engine.execute_run` on the event loop.
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models.voice import VoiceTriggerType, VoiceWorkflowTrigger
from app.database.models.workflow import (
    RunStatus,
    Workflow,
    WorkflowRun,
    WorkflowRunStep,
    WorkflowStep,
    WorkflowTrigger,
)
from app.services.workflow_engine import execute_run

log = logging.getLogger("app.voice.workflow_triggers")


def _matches(trigger: VoiceWorkflowTrigger, *, signal_type: str, value: Optional[str], text: str) -> bool:
    """Does ``trigger`` fire for the given signal?

    For keyword/phrase triggers, ``value`` is ignored and the transcript
    ``text`` is scanned. For intent/sentiment, ``value`` is compared. An empty
    ``match_values`` means "any signal of this type".
    """
    if trigger.trigger_type != signal_type:
        return False
    values = [str(v).lower() for v in (trigger.match_values or [])]

    if signal_type in (VoiceTriggerType.call_started, VoiceTriggerType.call_ended):
        return True
    if signal_type in (VoiceTriggerType.keyword, VoiceTriggerType.phrase):
        haystack = (text or "").lower()
        if not values:
            return bool(haystack)
        return any(v in haystack for v in values)
    # intent / sentiment — exact match against the supplied value.
    if not value:
        return False
    if not values:
        return True
    return value.lower() in values


def match_triggers(
    triggers: list[VoiceWorkflowTrigger],
    *,
    signal_type: str,
    value: Optional[str] = None,
    text: str = "",
) -> list[VoiceWorkflowTrigger]:
    """Return enabled triggers that match, ordered by ascending priority."""
    matched = [
        t for t in triggers
        if t.enabled and _matches(t, signal_type=signal_type, value=value, text=text)
    ]
    matched.sort(key=lambda t: (t.priority, t.created_at))
    return matched


async def fire_trigger(
    db: AsyncSession,
    trigger: VoiceWorkflowTrigger,
    *,
    context: Optional[dict[str, Any]] = None,
    schedule: bool = True,
) -> Optional[uuid.UUID]:
    """Create a workflow run for ``trigger`` and (optionally) schedule it.

    Returns the new run id, or ``None`` if the workflow has no steps. Caller is
    responsible for committing — this function flushes but defers the final
    commit to the caller so it can batch multiple fires.
    """
    workflow = await db.scalar(
        select(Workflow)
        .where(Workflow.id == trigger.workflow_id)
        .where(Workflow.organization_id == trigger.organization_id)
        .where(Workflow.deleted_at.is_(None))
    )
    if workflow is None:
        log.info("voice trigger %s references a missing workflow", trigger.id)
        return None

    steps = list((await db.scalars(
        select(WorkflowStep)
        .where(WorkflowStep.workflow_id == workflow.id)
        .order_by(WorkflowStep.order_index)
    )).all())
    if not steps:
        log.info("voice trigger %s workflow %s has no steps", trigger.id, workflow.id)
        return None

    run = WorkflowRun(
        workflow_id=workflow.id,
        organization_id=trigger.organization_id,
        status=RunStatus.queued,
        trigger=WorkflowTrigger.event,
        triggered_by=None,
        input={"source": "voice", "trigger_id": str(trigger.id),
               "trigger_type": trigger.trigger_type, **(context or {})},
        steps_total=len(steps),
    )
    db.add(run)
    await db.flush()

    for step in steps:
        db.add(WorkflowRunStep(
            run_id=run.id,
            organization_id=trigger.organization_id,
            step_id=step.id,
            order_index=step.order_index,
            type=step.type,
            name=step.name,
            config=step.config or {},
        ))

    trigger.fire_count += 1
    trigger.last_fired_at = datetime.now(timezone.utc)
    await db.flush()

    if schedule:
        run_id = run.id
        asyncio.get_event_loop().create_task(execute_run(run_id))
    return run.id


async def evaluate_and_fire(
    db: AsyncSession,
    *,
    organization_id: uuid.UUID,
    agent_id: Optional[uuid.UUID],
    signal_type: str,
    value: Optional[str] = None,
    text: str = "",
    context: Optional[dict[str, Any]] = None,
    schedule: bool = True,
) -> list[uuid.UUID]:
    """Load an agent's triggers, match the signal, fire all matches.

    Returns the list of started run ids. Best-effort — designed to be called
    from the live call path without ever breaking the call.
    """
    stmt = (
        select(VoiceWorkflowTrigger)
        .where(VoiceWorkflowTrigger.organization_id == organization_id)
        .where(VoiceWorkflowTrigger.enabled.is_(True))
        .where(VoiceWorkflowTrigger.trigger_type == signal_type)
    )
    if agent_id is not None:
        stmt = stmt.where(
            (VoiceWorkflowTrigger.agent_id == agent_id)
            | (VoiceWorkflowTrigger.agent_id.is_(None))
        )
    triggers = list((await db.scalars(stmt)).all())
    matched = match_triggers(triggers, signal_type=signal_type, value=value, text=text)

    run_ids: list[uuid.UUID] = []
    for trigger in matched:
        try:
            # Defer scheduling until after the commit so execute_run (which opens
            # its own session) can always see the persisted run.
            rid = await fire_trigger(db, trigger, context=context, schedule=False)
            if rid:
                run_ids.append(rid)
        except Exception as e:  # noqa: BLE001 — never break a call
            log.warning("voice trigger %s fire failed: %s", trigger.id, e)
    if run_ids:
        await db.commit()
        if schedule:
            for rid in run_ids:
                asyncio.get_event_loop().create_task(execute_run(rid))
    return run_ids
