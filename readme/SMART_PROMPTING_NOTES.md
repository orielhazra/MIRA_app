# Smart Prompting + Synced Context Notes

This version adds Smart Prompting and expands the data model for selective prompts.

## Smart Prompting behavior

The prompt now chooses context in layers instead of sending every full character/world detail every time:

- Full character detail: active cast members marked present in Current Context and characters pinned for prompting.
- Compact character detail: story characters mentioned in recent chat, Director Notes, Current Context, or prompt keywords.
- Name-only reference: inactive cast members that are not relevant to the current turn.
- World detail: compact world overview, current location in detail, and a limited list of available/nearby locations.
- Objects: only objects visible/relevant to the current location, user inventory, active characters, or recently mentioned by name.

## Director Notes sync

Director Notes and Current Context now stay aligned for objective scene facts:

- time of day
- current location
- atmosphere / scene mood
- current conflict

Current Context remains the factual source of truth in the prompt. Director Notes are treated as steering guidance.

## Expanded fields

Characters now support:

- race / type
- story role
- aliases
- prompt keywords
- smart prompt summary
- default outfit
- always include full details in smart prompt

Worlds now support:

- smart prompt overview
- prompt keywords
- available location library with summary, description, mood, exits, connected locations, hazards, and keywords
