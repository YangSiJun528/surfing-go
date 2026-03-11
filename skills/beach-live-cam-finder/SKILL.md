---
name: beach-live-cam-finder
description: Use this skill when the user wants to find a live YouTube beach camera or surf cam for a specific beach and return a stable embed-ready result with source confidence and fallback behavior.
---

# Beach Live Cam Finder

Use this skill when the task is to find a live YouTube video for a specific beach, coastline, or surf point and make the result usable inside a product UI.

## Goal

Find the most relevant live YouTube beach camera for one beach, return one stable primary result, and clearly mark fallback or uncertainty when no reliable live stream exists.

## Workflow

1. Read [references/search-rules.md](references/search-rules.md) and translate the request into explicit search terms.
2. Search for live YouTube results using the same query pattern and source preference every time.
3. Validate that the result is actually usable for the target beach:
   - live or recently active
   - visually tied to the beach or nearby coast
   - title, description, or channel context matches the location
4. Normalize the chosen result with [references/output-schema.md](references/output-schema.md).
5. If there is no high-confidence live result, return fallback status instead of forcing a weak match.

## Required Rules

- Prefer YouTube live videos over clips or short highlights.
- Prefer exact beach-name matches over city-level tourism streams.
- Prefer streams with visible coast, surf, or shoreline relevance.
- Keep one primary result per beach unless the user explicitly asks for alternatives.
- If the stream is only indirectly related to the beach, lower confidence and say why.
- If a stream cannot be embedded, still return the watch URL and mark embed status clearly.

## Output

Return:

- interpreted search terms
- one primary live-cam result
- optional fallback candidates only when confidence is low
- a short note on embedability or uncertainty

## References

- [references/search-rules.md](references/search-rules.md): fixed search and validation rules
- [references/output-schema.md](references/output-schema.md): normalized fields for the chosen video
