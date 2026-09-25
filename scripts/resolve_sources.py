#!/usr/bin/env python3
"""Resolve per-clip source metadata (entity + channeled date) from grounding notes."""
import re, json

ARCHIVE = "/home/hatch/workspace/user/files/C74CCA0A-0B0F-4368-8DA2-3A639E98AEAC-transcripts_full.txt"
DIALOGUE_MD = "/home/hatch/workspace/ether/game-package/scripts/DIALOGUE_ANSWERS_GAME.md"
QA_MD = "/home/hatch/workspace/ether/game-package/scripts/ARCHETYPE_QA_SCRIPTS.md"

print("loading archive...", flush=True)
with open(ARCHIVE, encoding="utf-8", errors="replace") as f:
    lines = f.read().split("\n")
print(f"{len(lines)} lines", flush=True)

HEADER_RE = re.compile(r"^\[(\d+)\]\s+(?:([A-Z][a-z]+ \d{1,2}, \d{4})\s+-\s+)?(.+)$")
def load_ra_dates():
    HDR = re.compile(r"^\[(\d+)\] The Ra Contact: Session (\d+)$")
    DATE = re.compile(r"(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, 19[78][0-9]")
    out, cur = {}, None
    for ln in lines:
        m = HDR.match(ln.strip())
        if m:
            cur = int(m.group(2))
            continue
        if cur is not None and cur not in out:
            d = DATE.search(ln)
            if d:
                out[cur] = d.group(0)
                cur = None
    return out

RA_DATES = load_ra_dates()
print(f"ra session dates: {len(RA_DATES)}", flush=True)
ENTITIES = {"ra": "Ra", "q'uo": "Q'uo", "quo": "Q'uo", "hatonn": "Hatonn",
            "latwii": "Latwii", "laitos": "Laitos", "oxal": "Oxal", "aaron": "Aaron"}
SKIP = {"questioner", "carla", "jim", "don", "transcript", "next", "previous",
        "channeling", "conscious channeling"}

# Words Ra spoke, later re-quoted inside Q'uo sessions where the writer found them.
# Overlay attribution follows the ORIGINAL channeling (entity + date of the words).
OVERRIDES = {
    269417: {"entity": "Ra", "date": "May 19, 1981",
              "session_label": "Ra Contact, Session 52",
              "via": "quoted by Q'uo, Saturday meditation, March 4, 2017"},
    251769: {"entity": "Ra", "date": "October 28, 1981",
              "session_label": "Ra Contact, Session 74",
              "via": "quoted by Q'uo, Saturday meditation, October 17, 2009"},
}

def resolve_archive(n):
    if n in OVERRIDES:
        o = OVERRIDES[n]
        return {"entity": o["entity"], "date": o["date"],
                "session_label": o["session_label"], "title": o["session_label"],
                "header_line": None, "via": o["via"]}
    """Return dict(entity, date, session_label, title) for archive line n."""
    header = None
    for i in range(n, max(-1, n - 40000), -1):
        m = HEADER_RE.match(lines[i].strip())
        if m:
            header = (i, m.group(2), m.group(3).strip())
            break
    if not header:
        return {"entity": None, "date": None, "session_label": None,
                "title": None, "note": "no header found"}
    hi, date, title = header
    # speaker label: nearest standalone entity name at/above n
    entity = None
    for i in range(n, max(hi, n - 60), -1):
        s = lines[i].strip().lstrip("#").strip()
        s = s.replace("’", "'").replace("‘", "'").strip("[]").strip().lower()
        if s in ENTITIES:
            entity = ENTITIES[s]
            break
        if s in SKIP:
            break  # hit a non-entity speaker block; stop
    tl = title.lower()
    sess_m = re.search(r"ra contact:?\s*session (\d+)", tl)
    if sess_m:
        sn = int(sess_m.group(1))
        entity = entity or "Ra"
        date = date or RA_DATES.get(sn)
        session_label = f"Ra Contact, Session {sn}"
    else:
        session_label = title
        if entity is None:
            if "aaron-quo" in tl:
                entity = "Q'uo"
            elif "hatonn" in tl:
                entity = "Hatonn"
            elif "latwii" in tl:
                entity = "Latwii"
    return {"entity": entity, "date": date, "session_label": session_label,
            "title": title, "header_line": hi}

ROMAN = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII",
         "XIV","XV","XVI","XVII","XVIII","XIX","XX","XXI","XXII"]

def parse_dialogue_md(path):
    text = open(path, encoding="utf-8").read()
    clips = []
    # split into archetype sections
    secs = re.split(r"^## ([IVX]+) — (.+?)(?: · still / bright / radiant)?$",
                    text, flags=re.M)
    # secs[0] preamble; then triples (roman, name, body)
    for i in range(1, len(secs), 3):
        roman, name, body = secs[i], secs[i+1].strip(), secs[i+2]
        # find prompt blocks
        for m in re.finditer(
            r"\*\*(teach|life|lost|afraid|still|bright|radiant)\b[^*]*\*\*\s*\n"
            r"\*\*Audio:\*\*\s*`([^`]+)`\s*\n\"(.*?)\"\s*\n\*Grounding:\s*(.*?)\*(\n|$)",
            body, flags=re.S):
            prompt, apath, spoken, grounding = (m.group(1), m.group(2),
                                               m.group(3), m.group(4))
            clips.append({"archetype": name, "numeral": roman, "prompt": prompt,
                          "audio": apath, "spoken": " ".join(spoken.split()),
                          "transcript": " ".join(spoken.split()),
                          "grounding": " ".join(grounding.split()),
                          "feature": "dialogue"})
    return clips

def parse_qa_md(path):
    text = open(path, encoding="utf-8").read()
    clips = []
    secs = re.split(r"^## Station (\d+) — (.+?) \((.+?)\)$", text, flags=re.M)
    for i in range(1, len(secs), 4):
        stn, name, role = secs[i], secs[i+1].strip(), secs[i+2]
        roman = ROMAN[int(stn)-1]
        body = secs[i+3]
        for m in re.finditer(
            r"\*\*Q([123]) — .*?\*\*.*?\n\*\*Audio:\*\*\s*`([^`]+)`\s*\n\"(.*?)\"\s*\n"
            r"\*Grounding:\s*(.*?)\*(\n|$)", body, flags=re.S):
            q, apath, spoken, grounding = (m.group(1), m.group(2),
                                            m.group(3), m.group(4))
            game_path = (f"public/audio/answers/{roman}/who.mp3" if q == "1"
                         else apath)
            clips.append({"archetype": name, "numeral": roman, "prompt": f"Q{q}",
                          "audio": apath, "game_audio": game_path,
                          "spoken": " ".join(spoken.split()),
                          "transcript": " ".join(spoken.split()),
                          "grounding": " ".join(grounding.split()),
                          "feature": "walk"})
    # passages: narrator, synthesis
    for m in re.finditer(r"\*\*Audio:\*\*\s*`(audio/archetype_qa/P\d+\.mp3)`", text):
        apath = m.group(1)
        clips.append({"archetype": "Passage", "numeral": None, "prompt": "passage",
                      "audio": apath, "game_audio": apath, "spoken": "",
                      "grounding": "narrator bridge between stations; no channeled source",
                      "feature": "walk"})
    return clips

def clip_source(clip):
    g = clip["grounding"]
    refs = re.findall(r"archive:(\d+)", g)
    sess = re.findall(r"Sessions?\s+(\d+)(?:\s*[–-]\s*(\d+))?", g)
    claimed = [e for e in ["Q'uo", "Hatonn", "Latwii", "Laitos", "Oxal", "Aaron"]
               if e.lower() in g.lower()]
    if not claimed and re.search(r"\bRa\b", g):
        claimed = ["Ra"]
    spoken = clip["spoken"]
    has_quote = bool(re.search(r"'[^']{8,}'", spoken))
    sources = []
    for n in refs:
        r = resolve_archive(int(n))
        src = {"entity": r["entity"], "date": r["date"],
               "session_label": r["session_label"],
               "archive_ref": f"archive:{n}",
               "kind": "quote" if has_quote else "paraphrase"}
        if r.get("via"):
            src["via"] = r["via"]
        sources.append(src)
    covered = set()
    for s in sources:
        m = re.search(r"Session (\d+)", s["session_label"] or "")
        if m:
            covered.add(int(m.group(1)))
    for s1s, s2s in sess:
        s1, s2 = int(s1s), int(s2s) if s2s else None
        nums = set(range(s1, (s2 or s1) + 1))
        if nums & covered:
            continue  # a specific citation already covers this range
        if s2:
            label = f"Ra Contact, Sessions {s1}–{s2}"
            d1, d2 = RA_DATES.get(s1), RA_DATES.get(s2)
            date = f"{d1} – {d2}" if d1 and d2 else "February 1982"
        else:
            label, date = f"Ra Contact, Session {s1}", RA_DATES.get(s1)
        if not any(x.get("session_label") == label for x in sources):
            sources.append({"entity": "Ra", "date": date,
                            "session_label": label, "archive_ref": None,
                            "kind": "quote" if has_quote else "paraphrase"})
    if not sources:
        sources = [{"entity": None, "date": None, "session_label": None,
                    "archive_ref": None, "kind": "synthesis"}]
    primary = sources[0]
    return {"sources": sources, "entity": primary["entity"], "date": primary["date"],
            "session_label": primary["session_label"],
            "archive_ref": primary["archive_ref"],
            "all_refs": [f"archive:{x}" for x in refs],
            "kind": primary["kind"], "claimed": claimed}

all_clips = parse_dialogue_md(DIALOGUE_MD) + parse_qa_md(QA_MD)
print(f"dialogue clips: {len(parse_dialogue_md(DIALOGUE_MD))}, qa clips: {len(parse_qa_md(QA_MD))}")

out = {}
problems = []
for c in all_clips:
    src = clip_source(c)
    key = c.get("game_audio") or c["audio"]
    # merge walk Q1 into dialogue who (same game path)
    entry = {"archetype": c["archetype"], "numeral": c["numeral"],
             "prompt": c["prompt"], "feature": c["feature"],
             "transcript": c.get("transcript", ""),
             "qa_audio": c["audio"] if c["feature"] == "walk" else None,
             **src}
    if key in out and c["feature"] == "dialogue":
        out[key].update({k: v for k, v in entry.items() if v})
    elif key not in out:
        out[key] = entry
    # mismatch check: claimed entity not among resolved entities
    resolved_entities = {s["entity"] for s in src["sources"] if s["entity"]}
    bad_claims = [c for c in src["claimed"] if c not in resolved_entities]
    if bad_claims and resolved_entities:
        problems.append({"audio": key, "claimed": src["claimed"],
                         "resolved": sorted(resolved_entities),
                         "ref": src["archive_ref"],
                         "grounding": c["grounding"][:200]})
    if src["kind"] != "synthesis" and (not src["entity"] or not src["date"]):
        problems.append({"audio": key, "issue": "unresolved entity/date",
                         "resolved": src, "grounding": c["grounding"][:160]})

with open("/tmp/dialogue_sources.json", "w") as f:
    json.dump(out, f, indent=1, ensure_ascii=False)
with open("/tmp/source_problems.json", "w") as f:
    json.dump(problems, f, indent=1, ensure_ascii=False)

from collections import Counter
print("total keys:", len(out))
print(Counter(v["kind"] for v in out.values()))
print(Counter(v["entity"] for v in out.values()))
print("problems:", len(problems))
for p in problems[:20]:
    print("-", p.get("audio"), "| claimed", p.get("claimed"), "-> resolved", p.get("resolved") or p.get("issue"))
