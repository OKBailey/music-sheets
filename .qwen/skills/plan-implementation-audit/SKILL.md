---
name: plan-implementation-audit
description: Systematically verify that planned features were correctly implemented, catching selector mismatches, migration gaps, and silent failures that surface-level checks miss.
source: auto-skill
extracted_at: '2026-05-29T15:53:27.366Z'
---

# Plan-vs-Implementation Audit

When someone asks you to "verify work against a plan" or "check completed features", use this methodology. It caught two critical CSS bugs and a data-migration gap in a 2,700-line JS app that a casual review would have missed entirely.

## Why This Skill Exists

"Did you implement feature X?" answered "yes" with code presence is not the same as the feature working. The two most common failure modes are:

1. **Glue disconnection** — code exists in isolation but the pieces don't connect (CSS selector targets the wrong HTML id, event listener bound to nonexistent element, etc.)
2. **Silent migration failures** — new fields assume data that older records don't have, causing duplicates, crashes, or lost state.

A surface-level grep ("found 12 matches for `dark-mode`") creates a false sense that the feature works. This audit catches what grep can't.

## The Methodology

For each planned feature, run these four checks in order:

### 1. Keyword Grep (Presence Check)

Grep the codebase for artifacts the feature would leave behind — class names, function names, DOM ids, state fields. This tells you *whether code exists*, not whether it works.

```
grep_search for: feature-specific keywords
glob: *.{js,css,html} (or whatever the project uses)
```

If nothing matches, the feature wasn't implemented — stop here and report.

### 2. Read Implementation Sites

Read the actual code at each grep hit. Understand the data flow: what triggers it, what state it touches, what renders or outputs.

**For UI features:** trace the chain from DOM element → event handler → state mutation → render.
**For data features:** trace the chain from input → validation → state → persistence → retrieval.

### 3. Cross-Reference the Glue (This Is Where Bugs Live)

This is the step that catches real bugs. For each feature:

- **CSS ↔ HTML:** Does every CSS selector (`.class`, `#id`) match an actual DOM element's id/class? Typo'd or renamed ids are extremely common.
- **JS DOM refs ↔ HTML:** Does `document.getElementById('foo')` have a matching `id="foo"` in the HTML?
- **State reads ↔ state writes:** Does every `state.field` read have a corresponding write somewhere? Does the persistence path (`localStorage`, database, etc.) actually include the new field?
- **Keyboard shortcuts ↔ handlers:** Is the shortcut key in the keydown handler consistent with what the UI tooltip claims?

In one audit, this step found `#chart-preview-paper.dark-mode` in CSS while the HTML element was `id="chart-paper"` — a selector mismatch that made dark mode completely dead despite 7 grep matches confirming "the feature exists."

### 4. Migration & Backwards Compatibility

Ask: **what happens to data saved before this feature existed?**

- New state fields with defaults (`''`, `null`, `false`) are usually safe — old records get the default.
- New deduplication keys or primary identifiers are dangerous — old records without the key will fail lookups, causing duplicates on save.
- New required fields that code assumes are always present can crash older data loads.

In one audit, `saveChartToLibrary` looked up by `c.data.id === state.id` — but pre-feature charts had no `state.id`, so every re-save created a duplicate entry with no way to recover.

## Output Format

Structure the audit as a per-feature table:

```markdown
| # | Feature | Status | Verdict |
|:-:|--------|--------|---------|
| 1 | Feature Name | ✅ Complete / ⚠️ Broken / ❌ Missing | Shippable / Needs fix |
```

For each feature with issues, document:
- **What's broken** (with file:line references)
- **Why it matters** (user-visible impact)
- **How to fix** (specific, actionable — not "improve error handling")

End with:
- **Cross-cutting observations** (positive patterns and shared risks)
- **Required fixes in priority order** (Critical → High → Medium → Low)
- **One-line verdict** (shippable / needs N fixes / do not ship)

## Calibration Rules

- Don't mark a feature ✅ just because you found grep matches. You must verify the glue.
- Don't inflate minor cosmetic issues to Critical. Broken user-facing behavior = Critical. Missing tooltip = Minor.
- Acknowledge what was done well — accurate praise maintains trust in the critical feedback.
- When a plan document doesn't exist for the tier/layer you're asked to review, say so explicitly rather than auditing against a different tier's plan.

## When to Use

- "Review the completed work against the plan"
- "Check if all the planned features are actually there"
- "Audit the agent's / contractor's / PR's implementation"
- Any time you're asked to verify completion, not just review quality

## When Not to Use

- General code quality review — use a standard code review instead
- Reviewing a single isolated change (the methodology is designed for multi-feature plans)
- Performance or security audits — those need specialized methodologies
