"""AI Prompt Studio API (Phase S).

One endpoint that turns a business description into a complete voice-agent
blueprint, plus a catalogue of industry starting points. No prompts are
written by hand — the studio generates them.
"""
from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.middleware.org_context import OrgContext, get_current_organization
from app.services.audit import audit
from app.services.voice import prompt_studio

router = APIRouter(tags=["voice-prompt-studio"])


class BlueprintRequest(BaseModel):
    business_type: str = Field(default="general", max_length=60)
    business_name: str = Field(default="", max_length=200)
    description: str = Field(default="", max_length=4000)
    tone: str = Field(default="", max_length=120)
    goals: str = Field(default="", max_length=600)
    language: str = Field(default="en", max_length=16)


class BlueprintResponse(BaseModel):
    system_prompt: str
    greeting: str
    conversation_flow: list[str] = Field(default_factory=list)
    voice_style: str = ""
    knowledge_structure: list[str] = Field(default_factory=list)
    suggested_questions: list[str] = Field(default_factory=list)
    generated: bool = False


@router.get("/api/voice/prompt-studio/templates")
async def list_industry_templates(
    ctx: OrgContext = Depends(get_current_organization),
):
    return {"items": prompt_studio.INDUSTRY_TEMPLATES, "total": len(prompt_studio.INDUSTRY_TEMPLATES)}


@router.post("/api/voice/prompt-studio/generate", response_model=BlueprintResponse)
async def generate_blueprint(
    payload: BlueprintRequest,
    ctx: OrgContext = Depends(get_current_organization),
):
    result = await prompt_studio.generate_blueprint(
        business_type=payload.business_type,
        business_name=payload.business_name,
        description=payload.description,
        tone=payload.tone,
        goals=payload.goals,
        language=payload.language,
    )
    audit(
        "generate",
        resource="voice_prompt_blueprint",
        organization_id=str(ctx.organization_id),
        user_id=str(ctx.user_id),
        meta={"business_type": payload.business_type, "generated": result.get("generated", False)},
    )
    return BlueprintResponse(**result)
