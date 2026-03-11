---
name: nearby-local-finder
description: Use this skill when the user wants to find restaurants, parking lots, or surf shops near a specific place with fixed search rules, normalized outputs, and stable comparisons across repeated runs.
---

# Nearby Local Finder

Use this skill when the task is to find nearby local places around a landmark, beach, address, or map point and keep the results as stable as possible across repeated searches.

## Goal

Fetch current nearby place information while keeping the search method, filtering rules, scoring, and output schema fixed so repeated runs produce similar result structure and ordering.

## Categories

Supported categories:

- `restaurant`
- `parking`
- `surf_shop`

Use one or more categories per request, but apply the same search window to all of them unless the user explicitly asks otherwise.

## Workflow

1. Read [references/search-rules.md](references/search-rules.md) and convert the request into explicit search parameters.
2. Read [references/category-rules.md](references/category-rules.md) for category-specific inclusion and exclusion rules.
3. Search each requested category with the same center point, radius or travel rule, and source priority.
4. Normalize every result with [references/output-schema.md](references/output-schema.md).
5. Apply the stability rules before ranking:
   - use the same filter order every time
   - use the same score order every time
   - use the same tie-breakers every time
6. Return the interpreted criteria, normalized results, and any uncertainty.

## Stability Rules

Use these rules to reduce variation across repeated runs:

- Keep the search center fixed to one explicit place or coordinate pair.
- Keep the search window fixed to one explicit radius or travel-time limit.
- Keep source priority fixed across runs.
- Prefer exact category matches over fuzzy matches.
- Exclude results that cannot satisfy a required field instead of guessing.
- Sort by the same ranking logic every time.
- Break ties in this order: distance, evidence quality, review volume if available, then name.
- Mark changing fields like hours, review count, and temporary closure as dynamic rather than treating them as ranking anchors.

## Output

Return:

- interpreted search parameters
- normalized results grouped by category
- excluded or uncertain candidates
- short note about which fields are dynamic

If the user asks for recommendations, explain the recommendation with normalized fields only.

## References

- [references/search-rules.md](references/search-rules.md): fixed search parameter rules
- [references/category-rules.md](references/category-rules.md): category-specific matching rules
- [references/output-schema.md](references/output-schema.md): required normalized output fields
