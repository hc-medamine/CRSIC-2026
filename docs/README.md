# Documentation index — CRSIC 2026

Project docs live under `docs/`. The root [README.md](../README.md) remains the living product source of truth. Content editor guides stay next to the JSON in [`data/`](../data/).

| Path | Role |
|------|------|
| [../README.md](../README.md) | Architecture, stack, routes, setup, roadmap |
| [WORKLOG.md](./WORKLOG.md) | Changelog + status snapshot (append newest at top) |
| [qa/SMOKE.md](./qa/SMOKE.md) | Pre-merge smoke checklist (~5 min) |
| [audits/AUDIT.md](./audits/AUDIT.md) | Closed architecture audit (P0–P3) |
| [audits/UIUX.md](./audits/UIUX.md) | UI/UX audit findings + fix log |
| [audits/PARITY.md](./audits/PARITY.md) | AR/EN parity matrix (partial EN) |
| [prds/](./prds/) | Product requirement documents (future) |
| [../data/README.md](../data/README.md) | Public JSON / locale editor guide |
| [../data/CMS.md](../data/CMS.md) | `CONTENT_BASE_URL` publish contract |

## Layout

```text
docs/
├── README.md          # This index
├── WORKLOG.md         # Living changelog
├── qa/
│   └── SMOKE.md       # Smoke / release QA checklist
├── audits/
│   ├── AUDIT.md       # Closed code audit
│   ├── UIUX.md        # UI/UX audit log
│   └── PARITY.md      # i18n parity matrix
└── prds/
    ├── README.md      # How to add PRDs
    └── TEMPLATE.md    # Concise PRD template
```

Only root `README.md` stays at the project root; all other project Markdown lives under `docs/`.
