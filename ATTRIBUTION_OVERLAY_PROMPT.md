# Source-overlay prompt for the Claude Code implementation agent

*Paste or hand this entire document to the agent building the Inward Journey
game. It is a spec, not flavor text — implement it as written.*

---

## What this is

Every line the archetypes speak in Inward Journey comes from one of two
content sets, each with exact transcripts and a source map:

- **Sit-with-an-archetype answers** — `public/audio/answers/{numeral}/{prompt}.mp3`
  (176 clips: `who`, `teach`, `life`, `lost`, `afraid`, `still`, `bright`, `radiant`
  × 22 archetypes)
- **Walk-deeper Q&A** — `audio/archetype_qa/` mapped to `second_feature/walk_deeper/`
  (87 clips: `A01Q1`–`A22Q3`, `P01`–`P21`)

For every clip there is a **source record** in `scripts/DIALOGUE_SOURCES.json`,
keyed by the clip's game audio path. Each record contains:

- `prompt` — which question this answers (`who`, `teach`, `life`, `lost`,
  `afraid`, `still`, `bright`, `radiant`, or `Q1/Q2/Q3/Pn`)
- `transcript` — the EXACT spoken text (what the audio says, word for word)
- `entity` — the channeled entity the words come from (`Ra`, `Q'uo`, `Latwii`,
  `Oxal`), or `null` when the text is an original dramatic synthesis
- `kind` — one of `quote`, `paraphrase`, `synthesis`
- `sources` — array of `{entity, date, session_label, archive_ref, kind, via?}`
- `all_refs` — every archive line the writer used

**Rule 0: never change the spoken text or the audio.** The transcripts are
locked. This prompt is only about what the *game displays alongside* them.

## The overlay — what the player sees

When an archetype speaks, the game already shows the spoken line as a
subtitle. ADD a quiet **source caption**, visually subordinate to the
subtitle — small, low-contrast, dismissable by simply looking away. Suggested
placement: directly beneath the subtitle block, or a corner of the dialogue
panel. It must never fight the contemplative mood: no badges, no icons, no
bright colors, no modal popups, no click-through interruptions.

The caption text depends on `kind`:

1. **`quote`** — words taken verbatim from a channeled session:
   `Quoting Ra · Ra Contact, Session 52 · May 19, 1981`
2. **`paraphrase`** — the writer's words, closely following a channeled passage:
   `After Ra · Ra Contact, Session 78 · February 19, 1982`
3. **`synthesis`** — original dramatic writing in the archetype's voice, with no
   direct channeled source. Show NO entity and NO date:
   `The archetype speaks · an original interpretation`

Formatting pattern: `{relation} {entity} · {session_label} · {date}`,
where `relation` is `Quoting` for `quote`, `After` for `paraphrase`.

## Multiple sources

Some clips draw on two sources (e.g. a Ra passage plus a Q'uo passage). Show
both, separated by a line break or `+`. Never merge two sources into one
line in a way that implies the entities co-spoke the sentence.

If a record has a `via` field (e.g. *"quoted by Q'uo, Saturday meditation,
March 4, 2017"*), the overlay credits the ORIGINAL speaker and ORIGINAL
channeled date. The `via` note belongs in the source-details expansion only
(see below), not in the quiet caption.

## Source details (optional expansion)

Provide a way to see more — a subtle "source" affordance near the caption
that opens the full record: all entities and dates, the session label, the
archive reference, and whether each is a quotation or paraphrase. This is
where the `via` notes and `archive_ref` values live. Keep it one quiet tap
away, never in the player's face.

## What never to display

- Never label an archetype's speech as "channeled", "a transmission", or
  imply the game itself is channeling anything. The game is an artistic work;
  the sources are real channeling sessions.
- Never show an entity name or date for `synthesis` clips. No invented
  attributions.
- Never show the date a passage was *re-quoted* as if it were the channeling
  date (the source map already resolves these to the original session).
- Never invent entities, sessions, or dates not present in
  `DIALOGUE_SOURCES.json`. If a record has `"entity": null`, show the
  synthesis caption, nothing more.

## Credits / about screen

Include a short, honest credits note, worded approximately like this:

> The archetypes' words draw on the L/L Research channeling archive —
> principally the Ra Contact sessions (1981–1984), with passages from Q'uo,
> Latwii, and Oxal. Verbatim quotations are captioned as such; other lines are
> paraphrases or original dramatic interpretations written for this game.
> Narration is AI-voiced. This is an independent artistic work, not affiliated
> with or endorsed by L/L Research. The complete archive is freely available
> at llresearch.org.

## Data wiring

`content/dialogues.json` (generated at packaging time) carries the same
information per answer in a `source` object:
`{kind, entity, entity_display, session_label, date, transcript, audio_path,
via?, all_sources[]}`. Bind the overlay to that object — do not hardcode
captions. If a clip's record is missing, fall back to the synthesis caption
rather than guessing.

## Acceptance check

Pick any 5 clips at random, open `DIALOGUE_SOURCES.json`, and confirm the
overlay shows exactly the entity, session label, and date from the record,
with the right `Quoting` / `After` / synthesis wording — and that the
subtitle text matches `transcript` exactly.
