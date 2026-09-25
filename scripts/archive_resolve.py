"""Shared archive resolver: entity + channeled date for any transcript line.

Ground truth comes from transcripts_full.txt headers. Used by
resolve_sources.py (dialogue audit) and build_transcript_orbs.py.
"""
import re
from pathlib import Path

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
            "latwii": "Latwii", "laitos": "Laitos", "oxal": "Oxal", "aaron": "Aaron",
            "l/leema": "L/Leema", "nona": "Nona", "lattoo": "Lattoo"}
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

