# OraOne Brand Guidelines

This is the source of truth for the OraOne logo/identity system, finalized
through a principal-designer review pass (see history below) for v1.0.0.

## Brand hierarchy

```
                         ORAONE
                           │
                    ┌──────┴──────┐
                    │             │
                MASTER         DERIVATIVE
                IDENTITY        ICON SYSTEM
                    │             │
              OraMark ("v4")  AppIcon ("v5")
                    │             │
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

- **`OraMark`** (the "O1" monogram — an open blue→cyan gradient ring
  wrapping a stylised "1") is **the logo**. Use it everywhere a brand mark
  is shown at 32px or larger: site header, login/auth screens, marketing
  pages, documentation, footers, presentations, GitHub, Open Graph assets.
- **`AppIcon`** (the same monogram, reversed to white, inside a solid
  gradient rounded-square tile) is **not an alternate logo** — it is a
  dedicated small-size/container derivative for: browser favicon, PWA/home
  screen icon, mobile app icon, dashboard/app-launcher icon, and any square
  social-profile-picture slot. Never call `AppIcon` "the logo" in copy or
  code — it exists solely to solve the sub-32px legibility problem that
  thin line-art has.
- The wordmark lockup is `[OraMark] OraOne` — "Ora" in `#0F172A` (or white
  on dark), "One" in `#2563EB`. Never append taglines/positioning text
  ("AI", "AI Platform", "Enterprise AI") into the permanent logo lockup —
  those are marketing copy, not identity.

## Small-size rule (production constraint, not a suggestion)

| Size | Requirement |
|---|---|
| 16px | Must remain recognizable as the OraOne monogram — use `AppIcon`, never the bare `OraMark`. |
| 24px | Must clearly preserve the O/1 structure — use `AppIcon`. |
| 32px | Should look essentially identical to the master mark — either is acceptable; `AppIcon` preferred for square icon slots. |
| 40px+ | Use `OraMark` (the master monogram) directly — this is the primary logo everywhere else. |

## Color tokens

| Token | Value | Usage |
|---|---|---|
| OraOne Blue | `#2563EB` | Gradient start, "One" in wordmark, primary buttons |
| OraOne Cyan | `#06B6D4` | Gradient end |
| OraOne Ink | `#0F172A` | "Ora" in wordmark, dark surfaces, headings |
| OraOne Surface | `#FFFFFF` | Light backgrounds, reversed/mono mark on dark |

The `AppIcon` tile uses the identical `OraOne Blue → OraOne Cyan` gradient
as the master mark — it reads as more cyan-dominant purely because a filled
square shows far more gradient area than a thin ring stroke does. This is
expected and intentional, not a second brand color.

## Source components

- `frontend/src/components/marketing/Logo.jsx`:
  - `OraMark` — the master monogram (single source-of-truth path geometry).
  - `AppIcon` — the favicon/app-icon derivative (same geometry, reversed,
    inside a gradient tile).
  - `Logo` — full lockup (`OraMark` + "OraOne" wordmark [+ optional tagline
    for marketing contexts, never baked into the permanent logo asset]).
- Static assets (`frontend/public/assets/`): see
  [assets/README.md](../frontend/public/assets/README.md) for the generated
  favicon/app-icon/OG-image files and how to regenerate them.

## Review history

The mark went through two rounds of principal-designer review (via an
external senior-architect/design consult) before being frozen for v1.0.0:

1. **Round 1**: compared the original production monogram, a lightly
   polished "v2" (unified gradient, thicker strokes), and a from-scratch
   simplified "1"-only app-icon tile. Verdict: keep the O/1 monogram as the
   primary identity — a standalone "1" is legible at small sizes but loses
   all brand distinctiveness ("it could be a banking app, a productivity
   app, anything called One"). Recommended an *optical* (not just
   mathematical) small-size correction of the monogram instead of replacing
   it, plus a monogram-in-container favicon derivative rather than a new
   symbol.
2. **Round 2**: applied the optical correction (heavier stroke weight,
   fuller bottom terminal, bolder top-right terminal — same geometry, not a
   redraw) and the monogram-in-rounded-square-tile favicon/app-icon.
   **Approved as final** for v1.0.0, with the explicit note to stop
   iterating the fundamental shape ("further changes are likely to be
   preference churn rather than meaningful improvement") and to freeze the
   geometry and move to asset generation/integration.

Do not open a third round of *concept* exploration for v1.0.0 — only
implementation-level asset work (exports, integration, regeneration) should
follow from here.
