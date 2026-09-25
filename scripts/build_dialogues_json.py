#!/usr/bin/env python3
"""Build content/dialogues.json for the game repo.

Merges exact transcripts (from the writer's scripts) with the verified source
map (scripts/DIALOGUE_SOURCES.json) so every answer carries:
  file, transcript, source{kind, entity, session_label, date, via?, all_sources[]}

Does not touch audio. Safe to re-run.
"""
import json
import re
from pathlib import Path

BASE = Path.home() / "workspace" / "ether" / "game-package"
SRC = json.loads((BASE / "scripts" / "DIALOGUE_SOURCES.json").read_text())
MD = (BASE / "scripts" / "DIALOGUE_ANSWERS_GAME.md").read_text()

NUMS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI",
        "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX",
        "XXI", "XXII"]
PROMPTS = ["who", "teach", "life", "lost", "afraid", "still", "bright", "radiant"]
FEELINGS = {"lost", "afraid", "still", "bright", "radiant"}
LABELS = {"who": "Who are you?", "teach": "What do you teach?",
          "life": "Where do I meet you in my life?", "lost": "I feel lost.",
          "afraid": "I feel afraid.", "still": "still", "bright": "bright",
          "radiant": "radiant"}

names = {}
for m in re.finditer(r"^## (X{0,3}(?:IX|IV|V?I{0,3})) — (.+?)(?: ·|$)",
                     MD, re.M):
    names[m.group(1)] = m.group(2).strip()
assert len(names) == 22, f"expected 22 archetype names, got {len(names)}"

answers = {}
missing = []
for i, n in enumerate(NUMS, 1):
    entry = {}
    # who: transcript/source of the QA Q1 clip (reused audio A{n}Q1.mp3)
    who_key = f"public/audio/answers/{n}/who.mp3"
    w = SRC.get(who_key)
    if not w:
        missing.append(who_key)
    entry["who"] = {
        "file": f"audio/answers/{n}/who.mp3",
        "transcript": w["transcript"] if w else "",
        "source": {
            "kind": w["kind"] if w else "synthesis",
            "entity": w["entity"] if w else None,
            "session_label": (w["sources"][0]["session_label"]
                              if w and w["sources"] else None),
            "date": (w["sources"][0]["date"] if w and w["sources"] else None),
            "via": (w["sources"][0].get("via") if w and w["sources"] else None),
            "all_sources": w["sources"] if w else [],
        },
    }
    for p in PROMPTS[1:]:
        key = f"public/audio/answers/{n}/{p}.mp3"
        r = SRC.get(key)
        if not r:
            missing.append(key)
            continue
        s0 = r["sources"][0] if r["sources"] else {}
        entry[p] = {
            "file": f"audio/answers/{n}/{p}.mp3",
            "transcript": r["transcript"],
            "source": {
                "kind": r["kind"],
                "entity": r["entity"],
                "session_label": s0.get("session_label"),
                "date": s0.get("date"),
                "via": s0.get("via"),
                "all_sources": r["sources"],
            },
        }
    answers[n] = entry

out = {
    "note": [
        "What you can say when you sit with an archetype, and what it answers.",
        "prompts: who/teach/life are questions; lost/afraid/still/bright/radiant "
        "are the heart-spectrum feelings ('How is your heart right now?').",
        "answers: for each archetype (by numeral) and each prompt id: the "
        "recording's file, its exact transcript, and its source record.",
        "source.kind: 'quote' = verbatim channeled words (overlay: 'Quoting X'); "
        "'paraphrase' = writer's words after a channeled passage (overlay: 'After X'); "
        "'synthesis' = original dramatic interpretation (overlay shows no entity/date).",
        "source.entity/date/session_label always describe the ORIGINAL channeling — "
        "never a later re-quoting. 'via' notes where the writer found the words.",
        "See scripts/ATTRIBUTION_OVERLAY_PROMPT.md for the overlay spec, and "
        "scripts/DIALOGUE_SOURCES.json for the full audit map.",
        "An answer with no recording shows its transcript as subtitles; with no "
        "transcript either, a placeholder line.",
    ],
    "prompts": [{"id": p, "kind": "feeling" if p in FEELINGS else "question",
                 "label": LABELS[p]} for p in PROMPTS],
    "names": names,
    "answers": answers,
}

dest = BASE / "content" / "dialogues.json"
dest.parent.mkdir(parents=True, exist_ok=True)
dest.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
n_answers = sum(len(v) for v in answers.values())
n_transcripts = sum(1 for v in answers.values() for a in v.values()
                    if a["transcript"])
print(f"wrote {dest}: {n_answers} answers, {n_transcripts} with transcripts")
if missing:
    print(f"MISSING {len(missing)}:", missing[:8])
