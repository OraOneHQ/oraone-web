from fastapi import Depends


def register_dashboard_routes(api, db, get_current_user):
    @api.get("/dashboard/overview")
    async def dashboard_overview(user: dict = Depends(get_current_user)):
        agents_count = await db.agents.count_documents({"user_id": user["id"]})
        leads_count = await db.leads.count_documents({"user_id": user["id"]})
        return {
            "calls_answered": 1246,
            "chats_handled": 2354,
            "whatsapp_chats": 1890,
            "leads_captured": max(689, leads_count),
            "appointments_booked": 342,
            "conversion_rate": 24.5,
            "agents_count": agents_count,
        }
