#!/usr/bin/env python3
"""Build content/transcript_orbs.json — the real 86-episode data delivery.

For each Voices from the Archive episode:
  - transcript: narration script with Aria:/Rowan: speaker labels stripped
    (audio is all-Aria; labels were TTS routing, never spoken)
  - sources: per archive line -> {entity, date, session_label, archive_ref},
    resolved from transcripts_full.txt headers (ground truth), cross-checked
    against the manifest's entity hints; mismatches reported, not silenced
  - vessel: ep01-ep08 -> orbs; ep09-ep86 -> 18 themed groves (trees)

Also copies the 86 MP3s into audio/orbs/.
"""
import json
import re
import shutil
from pathlib import Path

import archive_resolve as ar

BASE = Path.home() / "workspace" / "ether" / "game-package"
POD = Path.home() / "workspace" / "ether" / "podcast"
OUT_AUDIO = BASE / "audio" / "orbs"
DEST = BASE / "content" / "transcript_orbs.json"

HINT_NORM = {"hatonn": "Hatonn", "latwii": "Latwii", "q'uo": "Q'uo",
             "quo": "Q'uo", "laitos": "Laitos", "oxal": "Oxal",
             "aaron": "Aaron", "philip": "Philip", "l/leema": "L/Leema",
             "leema": "L/Leema", "ra": "Ra"}
SKIP_HINTS = {"the voices", "one of the voices", "a voice", "voices"}


def expand_nums(token):
    if "-" in token:
        a, b = token.split("-")
        return list(range(int(a), int(b) + 1))
    if "/" in token:
        return [int(x) for x in token.split("/")]
    return [int(token)]


def parse_manifests():
    """ep -> {passages: [(first_line, all_lines)], hints: {idx: name} positional}"""
    eps = {}
    files = [POD / "sources_manifest.md", POD / "sources_manifest_s3.md",
             POD / "sources_manifest_s4.md"]
    for f in files:
        for ln in f.read_text().split("\n"):
            m = re.match(r"- ep(\d+)\s+.*?:\s*archive lines?\s+(.+?)\s*\((.+)\)\s*$", ln)
            if not m:
                continue
            ep, numpart, hintpart = int(m.group(1)), m.group(2), m.group(3)
            # one token = one passage (ranges/slashes stay together)
            passages = []
            for tok in re.findall(r"\d+(?:[-/]\d+)?", numpart):
                passages.append((expand_nums(tok)[0], tok))
            # hints: "Hatonn on 57004" (specific) or bare names in token order
            hints, positional = {}, []
            for h in re.split(r"[,;]", hintpart):
                h = h.strip()
                mo = re.match(r"(.+?)\s+on\s+(\d+)$", h)
                if mo:
                    hints[int(mo.group(2))] = mo.group(1).strip()
                elif h:
                    positional.append(norm_hint(h))  # None for "the voices"
            eps[ep] = {"passages": passages, "hints": hints,
                       "positional": positional}
    return eps


def norm_hint(h):
    key = h.strip().lower().replace("’", "'")
    if key in SKIP_HINTS:
        return None
    return HINT_NORM.get(key, h.strip())


def episode_sources(ep, info, mismatches):
    srcs, seen = [], set()
    pos = info["positional"]  # one per passage token; None = "the voices"
    for idx, (n, tok) in enumerate(info["passages"]):
        r = ar.resolve_archive(n)
        entity, date = r["entity"], r["date"]
        hint = info["hints"].get(n)
        if hint is None and idx < len(pos):
            hint = pos[idx]
        hint = norm_hint(hint) if hint else None
        if hint and entity and hint != entity:
            mismatches.append(
                {"ep": ep, "line": n, "manifest_hint": hint,
                 "resolved": entity, "date": date})
        if entity is None and hint:
            entity = hint  # e.g. questioner lines the header-walk can't name
        label = r["session_label"]
        key = (entity, date)
        if key not in seen and (entity or date):
            seen.add(key)
            src = {"entity": entity, "date": date,
                   "session_label": label, "archive_ref": f"archive:{n}"}
            if r.get("via"):
                src["via"] = r["via"]
            srcs.append(src)
    return srcs


def clean_transcript(txt):
    paras = []
    for p in txt.split("\n\n"):
        p = p.strip()
        p = re.sub(r"^(Aria|Rowan):\s*", "", p)
        if p:
            paras.append(p)
    return "\n\n".join(paras)


# vessel assignment: 8 orbs, 18 groves
ORB_EPS = list(range(1, 9))
GROVES = [
    ("tree-01", "Grove of the Tender Heart", "meadow near the starting shore",
     [9, 10, 13, 14, 15]),
    ("tree-02", "Grove of Practice", "terraced hillside above the path",
     [11, 12, 18, 26, 34]),
    ("tree-03", "Grove of Knowing", "quiet hilltop with a stone bench",
     [16, 17, 21, 22]),
    ("tree-04", "Grove of Devotion", "candle-lit glade in soft shadow",
     [19, 20, 23, 24, 25]),
    ("tree-05", "Grove of Other Selves", "village commons around a fire circle",
     [27, 28, 29, 33]),
    ("tree-06", "Grove of the Living World", "deep forest, thick with green",
     [30, 31, 32]),
    ("tree-07", "Grove of Wonder", "high mountain meadow, near the flight paths",
     [35, 36, 39, 55, 56]),
    ("tree-08", "Grove of Release", "basin below a waterfall",
     [42, 43, 44, 47]),
    ("tree-09", "Grove of the Inner Child", "sunlit orchard",
     [45, 46, 48, 49]),
    ("tree-10", "Grove of Reverence", "ancient stone circle",
     [38, 50, 51, 52]),
    ("tree-11", "Grove of Stillness", "misty lake inlet",
     [37, 40, 41, 60]),
    ("tree-12", "Grove of Night and Sense", "twilight pines",
     [53, 54, 57, 58, 59]),
    ("tree-13", "Grove of Kindness", "warm village garden",
     [61, 73, 74, 75]),
    ("tree-14", "Grove of Solitude and Kin", "hermit's cliff with a small hearth",
     [62, 63, 64, 65]),
    ("tree-15", "Grove of Learning", "observatory hill",
     [66, 67, 68, 69, 70]),
    ("tree-16", "Grove of Enough", "farmland edge, a simple hut nearby",
     [71, 72, 76, 77]),
    ("tree-17", "Grove of Time", "white-sand expanse under open stars",
     [78, 79, 80, 81, 82]),
    ("tree-18", "Grove of Becoming", "sunrise point at the far shore",
     [83, 84, 85, 86]),
]


def main():
    eps = parse_manifests()
    print(f"episodes in manifests: {len(eps)}")
    assert len(eps) == 86, f"expected 86, got {len(eps)}"

    scripts = {int(re.match(r"ep(\d+)_", p.name).group(1)): p
               for p in (POD / "scripts").glob("ep*.txt")}
    audios = {int(re.match(r"ep(\d+)_", p.name).group(1)): p
              for p in (POD / "audio").glob("ep*.mp3")}
    assert len(scripts) == 86 and len(audios) == 86

    OUT_AUDIO.mkdir(parents=True, exist_ok=True)
    mismatches, missing_audio, missing_script = [], [], []

    def entry(ep):
        sp = scripts.get(ep)
        au = audios.get(ep)
        if not sp:
            missing_script.append(ep)
        if not au:
            missing_audio.append(ep)
        title = " ".join(sp.stem.split("_")[1:]).title() if sp else f"ep{ep}"
        transcript = clean_transcript(sp.read_text()) if sp else ""
        audio_rel = None
        if au:
            dest = OUT_AUDIO / au.name
            if not dest.exists():
                shutil.copy2(au, dest)
            audio_rel = f"audio/orbs/{au.name}"
        sources = episode_sources(ep, eps[ep], mismatches)
        return {"id": f"ep{ep:02d}", "episode": ep, "title": title,
                "audio": audio_rel, "transcript": transcript,
                "interpretive": True, "sources": sources}

    orbs = [dict(entry(ep), id=f"orb-{ep:02d}") for ep in ORB_EPS]
    trees = []
    for tid, name, biome, members in GROVES:
        trees.append({"id": tid, "name": name, "suggested_biome": biome,
                      "episodes": [entry(ep) for ep in members]})

    out = {
        "note": [
            "Every orb and every grove fruit plays one Voices from the Archive "
            "narration (Aria's voice). Bind visuals and the player to this file.",
            "transcript: exact narration text (speaker labels stripped; the "
            "audio is single-voice).",
            "interpretive: true on all 86 — these are interpretive adaptations "
            "of channeled material, not verbatim channeling. The game must "
            "caption them as such (see TRANSCRIPT_ORBS_CLAUDE_PROMPT.md).",
            "sources: per-episode channeled sources, resolved from the archive "
            "headers (entity + original channeled date). 'via' notes where the "
            "writer found re-quoted words.",
        ],
        "orbs": orbs,
        "trees": trees,
    }
    DEST.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")

    n_ep = len(orbs) + sum(len(t["episodes"]) for t in trees)
    n_tx = sum(1 for o in orbs if o["transcript"]) + sum(
        1 for t in trees for e in t["episodes"] if e["transcript"])
    print(f"wrote {DEST}: {n_ep} episodes, {n_tx} with transcripts, "
          f"{len(trees)} trees")
    print(f"mismatches (manifest hint vs archive): {len(mismatches)}")
    for m in mismatches[:30]:
        print(f"  ep{m['ep']:02d} line {m['line']}: hint={m['manifest_hint']} "
              f"resolved={m['resolved']} ({m['date']})")
    if missing_audio:
        print("missing audio:", missing_audio)
    if missing_script:
        print("missing scripts:", missing_script)
    Path(BASE / "scripts" / "orbs_mismatches.json").write_text(
        json.dumps(mismatches, indent=1))


if __name__ == "__main__":
    main()
