# OraOne — UML Diagrams

UML diagrams for the platform: actors and use cases, the core domain model,
and sequence/state diagrams for every major flow. All rendered as static
PNGs (see `scripts/diagram/src/uml-*.mmd` for sources — regenerate with
`npx @mermaid-js/mermaid-cli -i <file>.mmd -o <out>.png -b white -w 1400 -s 2`).

## Use case overview

![Use case diagram — Visitor, Customer/Org Owner, Developer, and Platform Admin actors against the OraOne platform's use cases](assets/uml/uml-use-case-overview.png)

## Domain model (class diagram)

![UML class diagram — User, Organization, Agent, Conversation, Message, KnowledgeBase, Document, DocumentChunk, Widget, Lead, ApiKey, VisitorProfile](assets/uml/uml-class-domain-model.png)

See [Database](DATABASE.md) for the underlying PostgreSQL schema (ER
diagram + fields) this class model maps onto.

---

## Auth flows

### Signup + email verification

![Sequence diagram — signup, email verification code, verify-email](assets/uml/uml-seq-auth-signup-verify.png)

### Login with email OTP (2FA)

![Sequence diagram — login, password check, email OTP, verify-otp, token issuance](assets/uml/uml-seq-auth-login-otp.png)

### Refresh token rotation + reuse detection

![Sequence diagram — refresh token rotation and reuse detection](assets/uml/uml-seq-auth-refresh-rotation.png)

### Password reset

![Sequence diagram — forgot password, reset code, reset password](assets/uml/uml-seq-auth-password-reset.png)

---

## AI chat agent — all scenarios

### Web widget chat (grounded RAG answer)

![Sequence diagram — widget chat with grounded RAG answer, citations, visitor memory](assets/uml/uml-seq-chat-widget-grounded.png)

### Web widget chat (no knowledge match / provider fallback)

![Sequence diagram — widget chat fallback to no-answer or MockProvider extractive response](assets/uml/uml-seq-chat-widget-fallback.png)

### WhatsApp inbound message

![Sequence diagram — Twilio webhook, omnichannel service, same RAG pipeline, reply sent back via Twilio](assets/uml/uml-seq-chat-whatsapp-inbound.png)

### Lead capture

![Sequence diagram — visitor submits lead form, scoring, conversation marked qualified](assets/uml/uml-seq-lead-capture.png)

### Escalation to a human

![Sequence diagram — visitor requests human, session/conversation marked escalated, support team picks it up](assets/uml/uml-seq-widget-escalation.png)

### Public API chat call

![Sequence diagram — external developer calls POST /v1/chat with an API key, scope and rate-limit checks](assets/uml/uml-seq-public-api-chat.png)

---

## Knowledge ingestion

### Document upload → processing

![Sequence diagram — document upload, background processing, text extraction, chunking, embedding](assets/uml/uml-seq-knowledge-document-upload.png)

### Website crawl

![Sequence diagram — website crawl job, frontier queue, parallel workers, chunking and embedding](assets/uml/uml-seq-knowledge-website-crawl.png)

---

## Widget lifecycle

### Create agent → publish widget

![Sequence diagram — create agent, activate, create widget, publish, embed snippet](assets/uml/uml-seq-widget-publish.png)

---

## Webhooks

### Transactional outbox delivery

![Sequence diagram — webhook outbox worker polling, signed delivery, retry, stale reclaim](assets/uml/uml-seq-webhook-delivery.png)

---

## Lifecycle state diagrams

### Document

![State diagram — pending, processing, processed, failed](assets/uml/uml-state-document-lifecycle.png)

### Conversation

![State diagram — active, qualified, completed, failed, lost](assets/uml/uml-state-conversation-lifecycle.png)

### Widget

![State diagram — draft, published, paused](assets/uml/uml-state-widget-lifecycle.png)

### Agent

![State diagram — draft, active, paused, archived](assets/uml/uml-state-agent-lifecycle.png)

Webhook outbox event state diagram lives in [Backend](BACKEND.md#transactional-outbox-webhooks--at-least-once-delivery).

---

## Scope note

This set covers every backend-verified flow (auth, chat across both
channels, knowledge ingestion, widget lifecycle, webhooks, the public API)
plus the domain model — not a literal diagram per front-end route (see
[Routes](ROUTES.md) for the full page inventory, 160+ routes). If a
specific page/flow isn't covered here and you want one added, say which
page and it'll be added the same way (a `.mmd` source + rendered PNG).
