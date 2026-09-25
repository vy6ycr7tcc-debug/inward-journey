# README for the implementation agent — Inward Journey content package

You are building (or extending) the Inward Journey contemplative game. This
package is the complete content handoff: audio, transcripts, scripts, source
attribution, and the specs that govern how the game presents them.

## What is in this package

**Feature 1 — Sit with an archetype (dialogue answers)**
The player sits with one of the 22 archetypes and asks questions or names a
feeling. The archetype answers in voice.
- Audio: `audio/answers/{numeral}/{prompt}.mp3` — 176 clips total, 8 prompts ×
  22 archetypes. Prompts: `who` ("Who are you?"), `teach` ("What do you
  teach?"), `life` ("Where do I meet you in my life?"), and the heart-spectrum
  feelings `lost`, `afraid`, `still`, `bright`, `radiant` ("How is your heart
  right now?").
- The `who` clips reuse the walk-deeper Threshold recordings (`A{n}Q1.mp3`).
- Voice: Aria (`avocado_v2:MAI_01`), speed 92, MP3. Never re-voice with
  another voice.
- Writer's scripts + audit: `scripts/DIALOGUE_ANSWERS_GAME.md`,
  `scripts/DIALOGUE_AUDIT_REPORT.md`.

**Feature 2 — Walk deeper (tunnel Q&A)**
A guided walk through the stations in catalyst-first order:
**Threshold** (Q1 — "Who are you?", spoken on arrival) → **Walk** (Q2 — "What
is the teaching?", deeper in) → **Heart** (Q3 — "How shall I work with you?",
innermost chamber) → **Passage** (a short narration on the road to the next
station).
- Audio: `audio/archetype_qa/` — 87 clips: `A01Q1`–`A22Q3` plus `P01`–`P21`
  passage narrations. Same voice and speed as Feature 1.
- Writer's scripts + audit: `scripts/ARCHETYPE_QA_SCRIPTS.md`,
  `scripts/QA_AUDIT_REPORT.md`.
- Clip → audio → in-game placement map: the table at the end of
  `ARCHETYPE_QA_SCRIPTS.md`.

**Shared data + specs**
- `content/dialogues.json` — every answer: audio file, EXACT transcript, and
  a `source` object (see below). Bind the game to this file.
- `scripts/DIALOGUE_SOURCES.json` — the full 241-clip audit map (entity, date,
  session, archive refs, verbatim-vs-paraphrase classification).
- `scripts/ATTRIBUTION_OVERLAY_PROMPT.md` — the spec for the in-game source
  caption. Implement it as written.
- `scripts/resolve_sources.py` — the script that built the source map from
  the grounding notes (re-runnable).
- `scripts/render_dialogue.py`, `scripts/build_dialogues_json.py` — the TTS
  render and JSON build scripts (re-runnable; render skips clips that already
  exist and validate).
- `RA_EVOLUTION_HANDBOOK.md` — the game bible: cosmology, archetypes,
  dialogue seeds, design notes (grounded in archive line numbers).
- `GAME_PROMPT.md` — the original game build prompt.

## The source overlay (mandatory)

Every spoken line carries a `source` record in `content/dialogues.json`.
`source.kind` is one of:

- `quote` — verbatim words from a channeled session → caption:
  `Quoting {entity} · {session_label} · {date}`
- `paraphrase` — the writer's words after a channeled passage → caption:
  `After {entity} · {session_label} · {date}`
- `synthesis` — original dramatic writing → caption:
  `The archetype speaks · an original interpretation` (no entity, no date)

Entity and date always describe the ORIGINAL channeling. The full spec —
placement, multi-source clips, the source-details expansion, and what never
to display — is in `scripts/ATTRIBUTION_OVERLAY_PROMPT.md`. Follow it
exactly. Never label game speech as "channeled", never invent an entity or
date, and never change the spoken text.

## Design constraints (from the owner)

- "Art as a door, not a lecture." "Easy easy game."
- No combat, enemies, scoring, timers, failure states, or wrong answers.
- Helpers are fallible fellow-learners, not saviors.
- Open-world feeling with a road/tunnel drawing the player deeper.
- Heart spectrum stays neutral, fluid, contemplative — no numbers, no labels
  that judge.
- The catalyst comes first, then the potentiator: the player walks deeper,
  "almost like a tunnel."

## Audio notes

- All narration is preset MP3. No live AI/RAG dialogue in the game.
- Subtitles are timed to the recordings automatically (by sentence); for exact
  timing add `"cues": [{"t": seconds, "text": "..."}]`.
- An answer with no recording shows its transcript as subtitles; with no
  transcript either, a placeholder line.
