# OraOne Brand Guidelines

This is the source of truth for the OraOne logo/identity system for v1.0.0.

## Brand hierarchy

```
                         ORAONE
                           │
                    ┌──────┴──────┐
                    │             │
                MASTER         DERIVATIVE
                IDENTITY        ICON SYSTEM
                    │             │
              OraMark          AppIcon
           ("Chat Spark")   (Chat Spark in
                    │        a gradient tile)
             ┌──────┼──────┐      │
             │      │      │      │
          Light   Dark   Mono   App/Favicon
             │      │      │      │
             └──────┴──────┘      │
                    │             │
                    └──────┬──────┘
                           │
                      OraOne brand
```

- **`OraMark`** ("Chat Spark" — a rounded blue→cyan gradient speech-bubble
  silhouette with a 4-point white AI "spark" cut into it) is **the logo**.
  Use it everywhere a brand mark is shown at 32px or larger: site header,
  login/auth screens, marketing pages, documentation, footers,
  presentations, GitHub, Open Graph assets.
- **`AppIcon`** (the same mark, reversed to white, inside a solid gradient
  rounded-square tile) is **not an alternate logo** — it is a dedicated
  small-size/container derivative for: browser favicon, PWA/home screen
  icon, mobile app icon, dashboard/app-launcher icon, and any square
  social-profile-picture slot. Never call `AppIcon` "the logo" in copy or
  code.
- The wordmark lockup is `[OraMark] OraOne` — "Ora" in `#0F172A` (or white
  on dark), "One" in `#2563EB`. Never append taglines/positioning text
  ("AI", "AI Platform", "Enterprise AI") into the permanent logo lockup —
  those are marketing copy, not identity.

## Why "Chat Spark" (and not the earlier O/1 monogram)

The original mark was an abstract "O1" ring monogram (an open circle
wrapping a stylised numeral "1"). It went through two rounds of external
design review and was approved on paper, but direct user feedback was that
the *concept itself* didn't work — it required explanation ("it's an O and
a 1") rather than reading instantly.

"Chat Spark" replaces it with a **literal, category-first** mark: a speech
bubble (the product — AI chat/WhatsApp conversations) with a 4-point spark
(AI) cut into it. It requires no decoding, reads correctly at every size
including 16px favicon scale, and still uses the same brand gradient and
color tokens, so no other brand asset (buttons, links, illustrations) needs
to change.

## Small-size rule (production constraint, not a suggestion)

| Size | Requirement |
|---|---|
| 16px | Must remain recognizable as a speech bubble with a spark — use `AppIcon` for the extra tile contrast. |
| 24px | Same — use `AppIcon`. |
| 32px | Either is acceptable; `AppIcon` preferred for square icon slots. |
| 40px+ | Use `OraMark` directly — this is the primary logo everywhere else. |

## Color tokens

| Token | Value | Usage |
|---|---|---|
| OraOne Blue | `#2563EB` | Gradient start, "One" in wordmark, primary buttons |
| OraOne Cyan | `#06B6D4` | Gradient end |
| OraOne Ink | `#0F172A` | "Ora" in wordmark, dark surfaces, headings |
| OraOne Surface | `#FFFFFF` | Light backgrounds, reversed/mono mark on dark |

## Source components

- `frontend/src/components/marketing/Logo.jsx`:
  - `OraMark` — the master mark (single source-of-truth path geometry:
    `BUBBLE_PATH` + `SPARK_PATH`).
  - `AppIcon` — the favicon/app-icon derivative (same geometry, reversed,
    inside a gradient tile).
  - `Logo` — full lockup (`OraMark` + "OraOne" wordmark [+ optional tagline
    for marketing contexts, never baked into the permanent logo asset]).
- Static assets (`frontend/public/assets/`): see
  [assets/README.md](../frontend/public/assets/README.md) for the generated
  favicon/app-icon/OG-image files and how to regenerate them.

## Revision history

1. **v1 (superseded)**: "O1" ring monogram. Went through two rounds of
   design review and optical refinement, approved on paper, but rejected
   after direct user feedback that the abstract letterform concept itself
   didn't communicate the product.
2. **v2 (current)**: "Chat Spark" — speech bubble + AI spark. Chosen over
   two other fresh concepts (a "signal/broadcast pulse" dot, and a
   "dual bubble" channel-overlap mark) for being the most immediately
   legible and most literally on-category, verified at 16-160px and on
   both light and dark backgrounds.
