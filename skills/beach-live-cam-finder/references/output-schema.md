# Output Schema

Normalize the chosen result with these fields.

## Required Fields

- `beach_name`
- `resolved_location`
- `video_title`
- `channel_name`
- `youtube_watch_url`
- `youtube_embed_url`
- `is_live`
- `embed_status`
- `match_summary`
- `confidence`

## Field Guidance

- `resolved_location`: concise beach and region form
- `youtube_watch_url`: standard watch URL
- `youtube_embed_url`: embed-ready URL if derivable, otherwise `unknown`
- `is_live`: `true`, `false`, or `unknown`
- `embed_status`: `embeddable`, `watch_only`, or `unknown`
- `match_summary`: 1 to 2 sentences explaining why the stream matches the beach
- `confidence`: `high`, `medium`, or `low`

## UI Guidance

If the result is `embeddable`, the UI can render an iframe player.

If the result is `watch_only`, the UI should show a preview card with an external link instead of forcing embed playback.
