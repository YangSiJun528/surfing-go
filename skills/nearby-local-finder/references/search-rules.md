# Search Rules

Translate the user request into these explicit fields before searching.

## Required Input Fields

- `anchor_place`: named place, address, or coordinates
- `categories`: one or more of `restaurant`, `parking`, `surf_shop`
- `search_window`: radius in meters or kilometers, or travel-time rule

## Optional Filters

- `budget_per_person`: mainly for restaurants
- `party_size`: mainly for restaurants
- `availability_constraint`: date, time, reservations, open-now preference
- `must_have`: parking available, shower, rentals, lessons, EV charging, valet, etc.
- `sort_preference`: `distance`, `quality`, or `balanced`

## Translation Rules

- Convert vague distance phrases into one explicit radius when possible.
- Convert vague place descriptions into one anchor point.
- If the user mentions "near the beach" or "around this spot", use the named beach or supplied coordinates as the anchor.
- If no radius is given, keep it as `unspecified` and report that the search window may broaden.
- If no sort preference is given, default to `balanced`.

## Fixed Source Policy

Use the same source priority for all candidates in the same run:

1. official listing or official website
2. map platform listing
3. reservation or booking listing
4. other third-party review source

When sources disagree, prefer the higher-priority source and mention the conflict briefly.
