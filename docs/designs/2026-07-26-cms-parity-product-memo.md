# Product decision memo — CMS / SPA parity (one page)

| Field | Value |
|-------|--------|
| Status | **Locked** |
| Date | 2026-07-26 |
| Context | Feature completeness audit — Phase 3 product call |
| Decide first | **Q3 → Q1 → Q2 → Q4** (SPA detail gates preview) |
| PRD | [2026-07-26-cms-spa-parity-preview-media.md](../prds/2026-07-26-cms-spa-parity-preview-media.md) (**Approved** — implementing) |

**Today (as-built):** Preview + emergency UI only for **news / event / publication**. SPA detail routes: `news`, `event`, `publication`, `research-project` only. Media buckets: `news` \| `events` \| `covers`. Partners & research groups are **list/card only** on the public site. Alerts are a site-wide banner (no detail page needed).

---

### Q3 — SPA detail for partners & research groups *(decide first)*

| Option | Meaning |
|--------|---------|
| **A. List-only** | No new detail routes |
| **B. Add partner + research-group detail** | Hash routes + detail templates |
| **C. Research-group only** | Partners stay list |

**Decision:** ☑ **B**  ☐ A  ☐ C  
**Notes:** Full profile pages for partners and research groups on the public SPA.

---

### Q1 — Preview tokens (partner / alert / research_group / research_project)

| Option | Meaning |
|--------|---------|
| **A. Keep 3-type limit** | news/event/publication only |
| **B. Extend all four** | partner/alert/research_group/research_project |
| **C. Extend only where SPA can render** | Partial |

**Decision:** ☑ **B**  ☐ A  ☐ C  
**Notes:** Unblocked by Q3=B for partner/group; alert = banner-style preview; research_project uses existing detail.

---

### Q2 — Emergency publish (same type set)

| Option | Meaning |
|--------|---------|
| **A. Keep 3-type limit** | news/event/publication only |
| **B. Extend all CMS types** | |
| **C. Align with Q1** | Same as preview |

**Decision:** ☑ **A**  ☐ B  ☐ C  
**Notes:** Emergency remains intentional for high-visibility editorial only. Document in PRD / ops — no code change.

---

### Q4 — Media buckets (partners / alerts / research)

| Option | Meaning |
|--------|---------|
| **A. 3-bucket limit intentional** | |
| **B. Add buckets** (`partners`, `research`, `alerts`) | |
| **C. One shared `general` bucket** | |

**Decision:** ☑ **B**  ☐ A  ☐ C  
**Notes:** Dedicated buckets for partners, research, and alerts (logos / diagrams / alert imagery as needed).

---

## Sign-off

| Role | Name | Date |
|------|------|------|
| Product / stakeholder | Chat lock | 2026-07-26 |
| Impl owner (after PRD Approved) | ____________ | ________ |

**Lock summary:**

```text
Q3 = B   Q1 = B   Q2 = A   Q4 = B
```

**Impl rule:** Implement only after the linked PRD is **Approved**. Re-run the feature-completeness audit after parity work lands.
