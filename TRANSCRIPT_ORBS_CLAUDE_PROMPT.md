# Claude Code prompt — transcript orbs + groves (Phase 1: placeholder build)

*Copy everything below the line into Claude Code.*

---

## Feature: transcript orbs and groves

You are extending the Inward Journey contemplative game. Build a new
exploration layer for the archive narration material: **orbs** and **groves**.

### The idea

The world holds 86 spoken transcript narrations (channeled-passage
narrations voiced by Aria, from the "Voices from the Archive" series). The
player discovers them by exploring the world — never by opening a menu.
There are two kinds of vessels:

- **Orbs** (8): small planet-like spheres floating through the world — in the
  sky, across the land, underwater. One narration each. These are the 8
  foundational episodes.
- **Groves** (18 trees): large stylized trees standing in themed locations.
  Each tree holds a cluster of narrations as glowing fruits (one fruit per
  narration). These hold the remaining 78 episodes in themed groups.

This is SEPARATE from the archetype stations. Archetype stations keep playing
only the archetype dialogue audio (`content/dialogues.json`). Orbs and groves
never appear at stations; they are the free-exploration layer.

### Phase 1: build it with placeholders

The real narrations will be delivered later with a data file. For now, build
both vessel systems against this contract:

**Data file: `content/transcript_orbs.json`**

    {
      "note": "Placeholders. Real audio + transcripts arrive later; schema is locked.",
      "orbs": [
        {
          "id": "orb-01",
          "title": "Placeholder: The Open Heart",
          "audio": "audio/orbs/orb-01.mp3",
          "transcript": "Placeholder transcript text.",
          "interpretive": true,
          "sources": [
            {"entity": "Q'uo", "date": "July 1, 1990", "session_label": "Saturday meditation, July 1, 1990"}
          ]
        }
      ],
      "trees": [
        {
          "id": "tree-01",
          "name": "Grove of the Tender Heart",
          "suggested_biome": "meadow near the starting shore",
          "episodes": [
            {
              "id": "tree-01-ep1",
              "title": "Placeholder: Forgiveness",
              "audio": "audio/orbs/tree-01-ep1.mp3",
              "transcript": "Placeholder transcript text.",
              "interpretive": true,
              "sources": [
                {"entity": "Hatonn", "date": "March 8, 1987", "session_label": "Sunday meditation, March 8, 1987"}
              ]
            }
          ]
        }
      ]
    }


- Create **8 placeholder orbs** (orb-01 … orb-08), varied titles/entities/dates.
- Create **2 placeholder trees** (`tree-01`, `tree-02`), each with **3
  placeholder episodes**.
- `interpretive: true` means the narration is an interpretive adaptation, NOT
  a verbatim channeling. The game must say so (see caption rules).

**Placeholder audio:** generate the 14 short placeholder MP3s with ffmpeg
(e.g. 30 seconds of a soft sine tone with fade in/out) at the `audio/orbs/`
paths in the JSON. Scaffolding only — replaced by the real Aria narrations at
delivery. Never present placeholder audio as final content.

### Vessel visuals and placement

**Orbs**
- Small planet/sphere: softly glowing, gently bobbing or in a slow orbit
  around its anchor point. Quiet and beautiful, never flashy.
- Distribute the 8 through the FULL world volume: at least 2 in the sky
  (reachable only by flying), at least 2 underwater (reachable only by
  swimming/diving), the rest across the land.

**Groves (trees)**
- Each grove is one large stylized tree, visually distinct per grove (vary
  silhouette, foliage color, glow accent — never garish).
- Each episode in the grove is a **glowing fruit** hanging in the tree — one
  fruit per episode, gently pulsing. Fruits are individually tappable.
- Place the 2 placeholder trees in clearly different biomes (e.g. one in a
  meadow, one by water). The real delivery will include 18 groves, each with
  a `suggested_biome` hint — read it from the JSON and honor it.
- On approach to a tree, show a small floating label: the grove's `name`
  (e.g. "Grove of the Tender Heart"). On approach to a single fruit, show
  that episode's label: `title` + `entity · date`. Labels fade with distance.

### Movement (required for this feature)

- Implement **free vertical flight** (rise/sink) and **underwater swimming**.
  Smooth, slow, contemplative — no speed lines, no timers. The player must be
  able to reach every orb and every grove. If your current movement system
  can't do this, extend it; this feature depends on it.

### Playback behavior (orbs and fruits share it)

- Tap/click an orb or a fruit → its narration starts playing.
- A small, quiet persistent player appears (not a modal): pause/resume and
  close buttons, plus the title. The player keeps exploring while it plays —
  movement is never locked.
- Closing or pausing is always one tap away, at any time.
- Tapping a different orb or fruit switches to that narration.
- When a narration ends: show two quiet choices —
  1. "Continue with background narration" → plays the ambient journey
     narrations (the existing J-series island narrations, which are NOT
     transcripts), and
  2. "Just the music" → back to the game's ambient music.
- Never autoplay a transcript narration. The player always starts it.

### Attribution caption (mandatory)

Next to the player, show a quiet source caption following these rules:

- If `interpretive` is true: `An interpretive narration after {entity} · {date}`
- If `interpretive` is false (direct quotation): `Quoting {entity} · {session_label} · {date}`
- Multiple sources: list each on its own line. Never merge them into one
  line that implies the entities spoke together.
- A "source" affordance opens the full record: transcript text, all
  entities/dates/session labels. One quiet tap away, never in the player's
  face.

And add this to the credits/about screen:

> Some narrations in this world are interpretive adaptations of channeled
> material from the L/L Research archive, voiced by AI. They are artistic
> interpretations, not the channeling itself. This is an independent work,
> not affiliated with or endorsed by L/L Research. The complete archive is
> freely available at llresearch.org.

### Acceptance check

1. All 8 orbs are reachable by flying or swimming — verify each one.
2. Both trees stand in distinct biomes; every fruit is tappable.
3. Approach labels: orb shows title + entity + date; tree shows grove name;
   fruit shows its episode's title + entity + date. All fade with distance.
4. Tap → audio plays, player moves freely, pause/close works instantly.
5. Narration end → the two quiet choices appear and both work.
6. Caption shows the "interpretive narration" wording for placeholders.
7. Archetype stations are untouched — they still play only archetype dialogue.
8. Replacing placeholder MP3s and the JSON with the real 8-orbs / 18-trees
   delivery requires no code change — everything binds to
   `content/transcript_orbs.json` (`orbs[]` and `trees[].episodes[]`).
