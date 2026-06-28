"""AI Sales API (Phase 3).

Per-agent sales profile CRUD plus the three core sales primitives exposed as
testable REST endpoints (and reused by the live call path):
qualify (BANT), recommend (catalogue ranking), quote (pricing).
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models.agent import Agent
from app.database.models.voice import SalesProfile
from app.database.session import get_db
from app.middleware.org_context import OrgContext, get_current_organization
from app.schemas.voice import (
    QualifyRequest,
    QuoteRequest,
    RecommendRequest,
    SalesProfileRead,
    SalesProfileUpsert,
)
from app.services.audit import audit
from app.services.voice.sales import lead_qualifier, product_recommender, quote_engine

router = APIRouter(tags=["voice-sales"])


async def _agent(db: AsyncSession, agent_id: uuid.UUID, org_id: uuid.UUID) -> Agent:
    agent = await db.scalar(
        select(Agent)
        .where(Agent.id == agent_id)
        .where(Agent.organization_id == org_id)
        .where(Agent.deleted_at.is_(None))
    )
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found.")
    return agent


async def _profile(db: AsyncSession, agent_id: uuid.UUID) -> SalesProfile | None:
    return await db.scalar(select(SalesProfile).where(SalesProfile.agent_id == agent_id))


@router.get("/api/agents/{agent_id}/sales", response_model=SalesProfileRead)
async def get_sales_profile(
    agent_id: uuid.UUID,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    await _agent(db, agent_id, ctx.organization_id)
    profile = await _profile(db, agent_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Sales profile not configured.")
    return profile


@router.put("/api/agents/{agent_id}/sales", response_model=SalesProfileRead)
async def upsert_sales_profile(
    agent_id: uuid.UUID,
    payload: SalesProfileUpsert,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    await _agent(db, agent_id, ctx.organization_id)
    profile = await _profile(db, agent_id)
    if profile is None:
        profile = SalesProfile(organization_id=ctx.organization_id, agent_id=agent_id)
        db.add(profile)
    for field_name, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field_name, value)
    await db.commit()
    await db.refresh(profile)
    audit(
        "update", resource="sales_profile", resource_id=str(profile.id),
        organization_id=str(ctx.organization_id), user_id=str(ctx.user_id),
    )
    return profile


@router.post("/api/agents/{agent_id}/sales/qualify")
async def qualify_lead(
    agent_id: uuid.UUID,
    payload: QualifyRequest,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    """Score a lead against BANT and return the next best question."""
    await _agent(db, agent_id, ctx.organization_id)
    profile = await _profile(db, agent_id)
    weights = (profile.configuration or {}).get("bant_weights") if profile else None
    result = lead_qualifier.score(payload.text, answers=payload.answers, weights=weights)
    return result.as_dict()


@router.post("/api/agents/{agent_id}/sales/recommend")
async def recommend_products(
    agent_id: uuid.UUID,
    payload: RecommendRequest,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    """Rank the agent's product catalogue against the caller's stated need."""
    await _agent(db, agent_id, ctx.organization_id)
    profile = await _profile(db, agent_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Sales profile not configured.")
    matches = product_recommender.recommend(profile.products, payload.need, top_k=payload.top_k)
    return {"recommendations": [m.as_dict() for m in matches]}


@router.post("/api/agents/{agent_id}/sales/quote")
async def generate_quote(
    agent_id: uuid.UUID,
    payload: QuoteRequest,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    """Generate a priced quote for a catalogue product (or an inline product)."""
    await _agent(db, agent_id, ctx.organization_id)
    profile = await _profile(db, agent_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Sales profile not configured.")
    if not profile.allow_quote_generation:
        raise HTTPException(status_code=409, detail="Quote generation is disabled for this agent.")

    product = payload.product
    if product is None and payload.product_name:
        product = next(
            (p for p in (profile.products or [])
             if str(p.get("name", "")).lower() == payload.product_name.lower()),
            None,
        )
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found in catalogue.")

    quote = quote_engine.build(product, payload.quantity, profile.pricing_rules)
    return quote.as_dict()
