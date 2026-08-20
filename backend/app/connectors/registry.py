"""Provider registry & catalog (Phase 10).

Single source of truth mapping a ``provider`` key to:

* its UI metadata (display name, category, auth type, icon, accent),
* whether it's wired for real OAuth yet (``available``), and
* the :class:`BaseConnector` subclass that implements it.

The API exposes :data:`PROVIDER_CATALOG` to render the integrations grid,
and the sync service uses :func:`get_connector` to instantiate the right
connector for a stored integration.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, Type

from app.connectors.base import BaseConnector
from app.connectors.google_drive import GoogleDriveConnector
from app.connectors.providers import (
    AzureDevopsConnector,
    ConfluenceConnector,
    DropboxConnector,
    GitbookConnector,
    GithubConnector,
    GitlabConnector,
    GmailConnector,
    HubspotConnector,
    JiraConnector,
    NotionConnector,
    OneDriveConnector,
    OutlookConnector,
    SalesforceConnector,
    SharepointConnector,
    SlackConnector,
    TeamsConnector,
    ZendeskConnector,
)
from app.database.models.integration import IntegrationType

if TYPE_CHECKING:
    from app.database.models.integration import Integration


# Five integration categories from the spec.
CATEGORY_COMMUNICATION = "communication"
CATEGORY_DOCUMENTS = "documents"
CATEGORY_DOCUMENTATION = "documentation"
CATEGORY_DEVELOPMENT = "development"
CATEGORY_CRM = "crm"


@dataclass(frozen=True)
class ProviderSpec:
    provider: str
    name: str
    category: str
    type: IntegrationType
    connector_cls: Type[BaseConnector]
    auth: str = "oauth"          # oauth | api_key
    icon: str = "Plug"           # lucide-react icon name for the UI
    color: str = "#2563EB"
    description: str = ""
    # ``available`` = real connector ready to fully implement; others are
    # registered + connectable in mock mode (so the platform is complete
    # end-to-end) and flagged "Coming soon" in the UI for real OAuth.
    available: bool = False


def _spec(**kw) -> ProviderSpec:
    return ProviderSpec(**kw)


PROVIDER_CATALOG: dict[str, ProviderSpec] = {
    # ── 1. Communication ──
    "gmail": _spec(
        provider="gmail", name="Gmail", category=CATEGORY_COMMUNICATION,
        type=IntegrationType.email, connector_cls=GmailConnector, icon="Mail",
        color="#EA4335", description="Read, search and summarize email; draft AI replies.",
    ),
    "outlook": _spec(
        provider="outlook", name="Outlook", category=CATEGORY_COMMUNICATION,
        type=IntegrationType.email, connector_cls=OutlookConnector, icon="Mail",
        color="#0078D4", description="Microsoft 365 & Exchange Online email.",
    ),
    "slack": _spec(
        provider="slack", name="Slack", category=CATEGORY_COMMUNICATION,
        type=IntegrationType.other, connector_cls=SlackConnector, icon="MessageSquare",
        color="#4A154B", description="Search channels, threads and messages.",
    ),
    "ms_teams": _spec(
        provider="ms_teams", name="Microsoft Teams", category=CATEGORY_COMMUNICATION,
        type=IntegrationType.other, connector_cls=TeamsConnector, icon="MessageCircle",
        color="#6264A7", description="Teams, chats and meeting transcripts.",
    ),
    # ── 2. Document platforms ──
    "google_drive": _spec(
        provider="google_drive", name="Google Drive", category=CATEGORY_DOCUMENTS,
        type=IntegrationType.storage, connector_cls=GoogleDriveConnector, icon="Cloud",
        color="#1A73E8", available=True,
        description="Auto-sync Drive folders into your Knowledge Base.",
    ),
    "onedrive": _spec(
        provider="onedrive", name="OneDrive", category=CATEGORY_DOCUMENTS,
        type=IntegrationType.storage, connector_cls=OneDriveConnector, icon="Cloud",
        color="#0364B8", description="Sync OneDrive documents into the Knowledge Base.",
    ),
    "sharepoint": _spec(
        provider="sharepoint", name="SharePoint", category=CATEGORY_DOCUMENTS,
        type=IntegrationType.storage, connector_cls=SharepointConnector, icon="Database",
        color="#038387", description="Enterprise document libraries.",
    ),
    "dropbox": _spec(
        provider="dropbox", name="Dropbox", category=CATEGORY_DOCUMENTS,
        type=IntegrationType.storage, connector_cls=DropboxConnector, icon="Cloud",
        color="#0061FF", description="Sync Dropbox folders into the Knowledge Base.",
    ),
    # ── 3. Documentation systems ──
    "notion": _spec(
        provider="notion", name="Notion", category=CATEGORY_DOCUMENTATION,
        type=IntegrationType.other, connector_cls=NotionConnector, icon="BookOpen",
        color="#000000", description="Sync pages, databases and wikis.",
    ),
    "confluence": _spec(
        provider="confluence", name="Confluence", category=CATEGORY_DOCUMENTATION,
        type=IntegrationType.other, connector_cls=ConfluenceConnector, icon="BookOpen",
        color="#172B4D", description="Enterprise knowledge spaces.",
    ),
    "gitbook": _spec(
        provider="gitbook", name="GitBook", category=CATEGORY_DOCUMENTATION,
        type=IntegrationType.other, connector_cls=GitbookConnector, icon="BookOpen",
        color="#3884FF", description="Product & developer documentation.",
    ),
    # ── 4. Development tools ──
    "github": _spec(
        provider="github", name="GitHub", category=CATEGORY_DEVELOPMENT,
        type=IntegrationType.other, connector_cls=GithubConnector, icon="Github",
        color="#181717", description="Issues, pull requests and code.",
    ),
    "gitlab": _spec(
        provider="gitlab", name="GitLab", category=CATEGORY_DEVELOPMENT,
        type=IntegrationType.other, connector_cls=GitlabConnector, icon="Github",
        color="#FC6D26", description="Repositories, issues and merge requests.",
    ),
    "jira": _spec(
        provider="jira", name="Jira", category=CATEGORY_DEVELOPMENT,
        type=IntegrationType.other, connector_cls=JiraConnector, icon="Activity",
        color="#0052CC", description="Projects, sprints and tickets.",
    ),
    "azure_devops": _spec(
        provider="azure_devops", name="Azure DevOps", category=CATEGORY_DEVELOPMENT,
        type=IntegrationType.other, connector_cls=AzureDevopsConnector, icon="Activity",
        color="#0078D7", description="Boards, repos and pipelines.",
    ),
    # ── 5. CRM / business ──
    "salesforce": _spec(
        provider="salesforce", name="Salesforce", category=CATEGORY_CRM,
        type=IntegrationType.crm, connector_cls=SalesforceConnector, icon="Cloud",
        color="#00A1E0", description="Leads, opportunities and accounts.",
    ),
    "hubspot": _spec(
        provider="hubspot", name="HubSpot", category=CATEGORY_CRM,
        type=IntegrationType.crm, connector_cls=HubspotConnector, icon="Database",
        color="#FF7A59", description="Contacts and deals.",
    ),
    "zendesk": _spec(
        provider="zendesk", name="Zendesk", category=CATEGORY_CRM,
        type=IntegrationType.crm, connector_cls=ZendeskConnector, icon="MessageCircle",
        color="#03363D", description="Support tickets.",
    ),
}


def list_specs() -> list[ProviderSpec]:
    return list(PROVIDER_CATALOG.values())


def get_spec(provider: str) -> Optional[ProviderSpec]:
    return PROVIDER_CATALOG.get(provider)


def get_connector(integration: "Integration") -> BaseConnector:
    """Instantiate the connector bound to a stored integration row."""
    spec = PROVIDER_CATALOG.get(integration.provider)
    if spec is None:
        raise KeyError(f"Unknown integration provider: {integration.provider!r}")
    return spec.connector_cls(integration=integration)


def get_connector_for_provider(provider: str) -> BaseConnector:
    """Instantiate a connector with no bound row (used during connect)."""
    spec = PROVIDER_CATALOG.get(provider)
    if spec is None:
        raise KeyError(f"Unknown integration provider: {provider!r}")
    return spec.connector_cls(integration=None)
