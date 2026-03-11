# Output Schema

Normalize every candidate into the same shape.

## Common Fields

- `name`
- `category`
- `anchor_place`
- `lat`
- `lng`
- `google_maps_url`
- `distance`
- `address`
- `hours`
- `status`
- `source_links`
- `match_summary`
- `confidence`

## Category-Specific Fields

### Restaurant

- `food_type`
- `price_level`
- `signature_items`
- `reservation_info`
- `best_for`

### Parking

- `parking_type`
- `public_access`
- `fee_info`
- `capacity_info`
- `ev_charging`

### Surf Shop

- `services`
- `rental_available`
- `lesson_available`
- `repair_available`
- `gear_focus`

## Field Guidance

- `lat`, `lng`: store the candidate location as decimal coordinates when available
- `google_maps_url`: store a direct Google Maps URL for the candidate location
- `distance`: use one consistent unit within a response
- `hours`: concise current operating summary or `unknown`
- `status`: `open`, `temporarily_closed`, `permanently_closed`, or `unknown`
- `source_links`: 1 to 3 highest-confidence links
- `match_summary`: 1 to 2 sentences based on verified fields only
- `confidence`: `high`, `medium`, or `low`

## Ranking Guidance

If ranking is requested, score candidates in this order:

1. hard-filter fit
2. distance fit
3. evidence quality
4. category-specific usefulness
5. soft-preference fit

Use tie-breakers in this order:

1. shorter distance
2. stronger source quality
3. larger review volume if available
4. alphabetical name
