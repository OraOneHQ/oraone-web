"""Voice Workflow Triggers API (Phase 6).

CRUD for the bindings between voice-call signals and Workflows, plus a dry-run
``test`` (match without firing) and an explicit ``fire`` endpoint (match and
launch workflow runs) that mirrors what the live call path invokes.
"""
from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models.voice import VoiceWorkflowTrigger
from app.database.models.workflow import Workflow
from app.database.session import get_db
from app.middleware.org_context import OrgContext, get_current_organization
from app.middleware.project_context import ProjectContext, get_current_project
from app.schemas.voice import (
    TriggerFireRequest,
    TriggerTestRequest,
    WorkflowTriggerCreate,
    WorkflowTriggerListResponse,
    WorkflowTriggerRead,
    WorkflowTriggerUpdate,
)
from app.services.audit import audit
from app.services.voice.workflow_triggers import (
    evaluate_and_fire,
    fire_trigger,
    match_triggers,
)

router = APIRouter(tags=["voice-workflows"])


async def _get_trigger(db: AsyncSession, trigger_id: uuid.UUID, org_id: uuid.UUID) -> VoiceWorkflowTrigger:
    t = await db.scalar(
        select(VoiceWorkflowTrigger)
        .where(VoiceWorkflowTrigger.id == trigger_id)
        .where(VoiceWorkflowTrigger.organization_id == org_id)
    )
    if t is None:
        raise HTTPException(status_code=404, detail="Trigger not found.")
    return t


async def _assert_workflow(db: AsyncSession, workflow_id: uuid.UUID, org_id: uuid.UUID) -> None:
    wf = await db.scalar(
        select(Workflow.id)
        .where(Workflow.id == workflow_id)
        .where(Workflow.organization_id == org_id)
        .where(Workflow.deleted_at.is_(None))
    )
    if wf is None:
        raise HTTPException(status_code=404, detail="Workflow not found.")


@router.get("/api/voice/workflow-triggers", response_model=WorkflowTriggerListResponse)
async def list_triggers(
    agent_id: Optional[uuid.UUID] = Query(default=None),
    trigger_type: Optional[str] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(VoiceWorkflowTrigger).where(
        VoiceWorkflowTrigger.organization_id == ctx.organization_id
    )
    if agent_id:
        stmt = stmt.where(VoiceWorkflowTrigger.agent_id == agent_id)
    if trigger_type:
        stmt = stmt.where(VoiceWorkflowTrigger.trigger_type == trigger_type)
    total = await db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = await db.scalars(
        stmt.order_by(VoiceWorkflowTrigger.priority, desc(VoiceWorkflowTrigger.created_at))
        .limit(limit).offset(offset)
    )
    return WorkflowTriggerListResponse(items=list(rows.all()), total=int(total or 0))


@router.post("/api/voice/workflow-triggers", response_model=WorkflowTriggerRead, status_code=201)
async def create_trigger(
    payload: WorkflowTriggerCreate,
    pctx: ProjectContext = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    ctx = pctx.org
    await _assert_workflow(db, payload.workflow_id, ctx.organization_id)
    trigger = VoiceWorkflowTrigger(
        organization_id=ctx.organization_id,
        project_id=pctx.project_id,
        agent_id=payload.agent_id,
        workflow_id=payload.workflow_id,
        name=payload.name,
        enabled=payload.enabled,
        trigger_type=payload.trigger_type,
        match_values=payload.match_values,
        priority=payload.priority,
        once_per_call=payload.once_per_call,
        configuration=payload.configuration or {},
    )
    db.add(trigger)
    await db.commit()
    await db.refresh(trigger)
    audit(
        "create", resource="voice_workflow_trigger", resource_id=str(trigger.id),
        organization_id=str(ctx.organization_id), user_id=str(ctx.user_id),
    )
    return trigger


@router.get("/api/voice/workflow-triggers/{trigger_id}", response_model=WorkflowTriggerRead)
async def get_trigger(
    trigger_id: uuid.UUID,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    return await _get_trigger(db, trigger_id, ctx.organization_id)


@router.patch("/api/voice/workflow-triggers/{trigger_id}", response_model=WorkflowTriggerRead)
async def update_trigger(
    trigger_id: uuid.UUID,
    payload: WorkflowTriggerUpdate,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    trigger = await _get_trigger(db, trigger_id, ctx.organization_id)
    data = payload.model_dump(exclude_unset=True)
    if "workflow_id" in data and data["workflow_id"]:
        await _assert_workflow(db, data["workflow_id"], ctx.organization_id)
    for field_name, value in data.items():
        setattr(trigger, field_name, value)
    await db.commit()
    await db.refresh(trigger)
    return trigger


@router.delete("/api/voice/workflow-triggers/{trigger_id}", status_code=204)
async def delete_trigger(
    trigger_id: uuid.UUID,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    trigger = await _get_trigger(db, trigger_id, ctx.organization_id)
    await db.delete(trigger)
    await db.commit()
    audit(
        "delete", resource="voice_workflow_trigger", resource_id=str(trigger_id),
        organization_id=str(ctx.organization_id), user_id=str(ctx.user_id),
    )
    return None


@router.post("/api/voice/workflow-triggers/test")
async def test_triggers(
    payload: TriggerTestRequest,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    """Dry-run: which triggers would fire for this signal (no runs started)."""
    stmt = select(VoiceWorkflowTrigger).where(
        VoiceWorkflowTrigger.organization_id == ctx.organization_id,
        VoiceWorkflowTrigger.trigger_type == payload.signal_type,
    )
    if payload.agent_id:
        stmt = stmt.where(
            (VoiceWorkflowTrigger.agent_id == payload.agent_id)
            | (VoiceWorkflowTrigger.agent_id.is_(None))
        )
    triggers = list((await db.scalars(stmt)).all())
    matched = match_triggers(
        triggers, signal_type=payload.signal_type, value=payload.value, text=payload.text
    )
    return {
        "matched": [
            {"id": str(t.id), "name": t.name, "workflow_id": str(t.workflow_id),
             "priority": t.priority}
            for t in matched
        ],
        "count": len(matched),
    }


@router.post("/api/voice/workflow-triggers/fire")
async def fire_triggers(
    payload: TriggerFireRequest,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    """Match the signal and launch workflow runs for every matching trigger."""
    context = dict(payload.context or {})
    if payload.call_id:
        context["call_id"] = str(payload.call_id)
    run_ids = await evaluate_and_fire(
        db,
        organization_id=ctx.organization_id,
        agent_id=payload.agent_id,
        signal_type=payload.signal_type,
        value=payload.value,
        text=payload.text,
        context=context,
    )
    return {"started_runs": [str(r) for r in run_ids], "count": len(run_ids)}
