# Inward Journey — game package audit report (2026-09-25)

## Contents verified

| Layer | Files | Duration | Notes |
|---|---|---|---|
| Sit-down archetype answers (`audio/answers/`) | 176 MP3 | 60.9 min | 22 numerals × 8 prompts; all-Aria @ speed 92 |
| Walk-deeper clips (`audio/archetype_qa/`) | 87 MP3 | 24.8 min | A01Q1–A22Q3 + P01–P21, unchanged |
| Transcript orbs (`audio/orbs/`) | 86 MP3 | 475.7 min | Voices from the Archive ep01–ep86, all-Aria |
| **Total audio** | **349 MP3** | **561.4 min (9.36 h)** | all ffprobe-valid, 0 failures |

## Data files

- `content/dialogues.json` — 176 answer records: exact audio path, exact
  transcript, content kind, entity, session label, date, `via`, all sources.
- `content/transcript_orbs.json` — 86 episodes with full transcripts
  (speaker labels stripped), per-episode source records, vessel assignment
  (8 orbs for ep01–ep08; 18 themed groves for ep09–ep86).
- `scripts/DIALOGUE_SOURCES.json` — 241 unique source records for the
  sit-down/walk-deeper layers.

## Provenance verification (transcript orbs)

Every episode's archive lines were resolved against the transcript archive's
own speaker labels, then cross-checked against the podcast source manifests.
8 manifest hints were wrong and were corrected to the archive's ground truth
(all 8 verified by reading the actual `[Entity]` labels in the archive):

- ep16: two passages are **Latwii** (manifest said Q'uo, Hatonn)
- ep19: **Laitos** (manifest said Latwii)
- ep20: **Hatonn** (manifest said Laitos)
- ep22: **Lattoo** (manifest said Hatonn) — rare entity, confirmed in archive
- ep56: **Hatonn** (manifest typo "Latui")
- ep72, ep79: **Oxal** (manifest said Latwii) — rare entity, confirmed twice
- ep53: **Nona** (manifest correct; resolver learned the entity)
- ep76: **Lattoo** (manifest correct; resolver learned the entity)
- ep44: **L/Leema** (manifest correct; resolver learned the entity)

All 86 episodes are `interpretive: true` — interpretive adaptations, never
presented as verbatim channeling. The two known re-quotations (Ra Session 52
via Q'uo 2017; Ra Session 74 via Q'uo 2009) carry `via` notes crediting the
original entity/date.

## Locked render settings

- Voice: Aria = `avocado_v2:MAI_01`, speed 92, MP3. No voice switching on
  failure. Script speaker labels (`Aria:`/`Rowan:`) were TTS routing only and
  are stripped from display transcripts; the audio is single-voice throughout.

## For the Claude Code agent

- `README_FOR_AGENT.md` — how the package fits together.
- `TRANSCRIPT_ORBS_CLAUDE_PROMPT.md` — orb/grove build prompt (Phase 1
  placeholders; this delivery is the real-data swap).
- `ATTRIBUTION_OVERLAY_PROMPT.md` — archetype-station caption rules.
