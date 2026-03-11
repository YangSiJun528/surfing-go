# Search Rules

Use these rules to keep live-cam lookup stable across repeated runs.

## Required Input Fields

- `beach_name`
- `region`
- `country`

## Query Construction

Build search terms in this priority order:

1. exact beach name + `live cam`
2. exact beach name + `surf cam`
3. exact beach name + region + `live`
4. nearby coast or harbor name + `live cam` only if direct beach results are missing

## Validation Rules

Treat a result as strong when:

- the title or description names the same beach
- the channel context matches the region
- the stream is marked live or has active recent streaming context
- the scene is clearly beach, ocean, shoreline, or surf relevant

Lower confidence when:

- the result only references the city, not the beach
- the result is a tourism mix feed with unclear camera location
- the stream appears intermittent or stale

Reject when:

- it is a highlight clip, vlog, or edited travel video
- it is unrelated drone footage
- the location cannot be tied to the target beach

## Fallback Rules

If no strong beach-specific live stream exists, allow one fallback in this order:

1. nearby surf cam
2. nearby harbor or coastline live cam
3. no reliable live stream found
