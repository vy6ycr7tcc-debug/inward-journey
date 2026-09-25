#!/usr/bin/env python3
"""Render the 154 sit-with-an-archetype dialogue clips with TTS (Aria, speed 92).

Parses scripts/DIALOGUE_ANSWERS_GAME.md for (prompt, audio path, spoken text),
renders each missing/invalid clip via the bundled `tts` CLI, and validates with
ffprobe. Safe to re-run: skips clips that already exist and play.

Output: ~/workspace/ether/game-package/audio/answers/{numeral}/{prompt}.mp3
"""
import json
import re
import subprocess
import sys
from pathlib import Path

BASE = Path.home() / "workspace" / "ether" / "game-package"
MD = BASE / "scripts" / "DIALOGUE_ANSWERS_GAME.md"
OUT = BASE / "audio" / "answers"
MANIFEST = BASE / "scripts" / "dialogue_clips.json"
LOG = BASE / "scripts" / "render_log.txt"

VOICE = "avocado_v2:MAI_01"   # Aria — locked in 2026-09-25 (never Rowan)
SPEED = "92"

BLOCK = re.compile(
    r"^\*\*([a-z]+)(?: — \"[^\"]*\")?\*\*\s*\n"
    r"\*\*Audio:\*\*\s*`([^`]+)`\s*\n"
    r"\"(.*?)\"",
    re.M | re.S,
)


def parse():
    text = MD.read_text(encoding="utf-8")
    clips = []
    for m in BLOCK.finditer(text):
        prompt, path, spoken = m.group(1), m.group(2), m.group(3)
        spoken = " ".join(spoken.split())  # collapse newlines, keep wording exact
        if not path.startswith("public/audio/answers/"):
            continue
        clips.append({"prompt": prompt, "path": path, "text": spoken})
    return clips


def valid_mp3(p: Path) -> bool:
    if not p.exists() or p.stat().st_size < 1024:
        return False
    try:
        r = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "csv=p=0", str(p)],
            capture_output=True, text=True, timeout=30)
        return bool(r.stdout.strip()) and float(r.stdout.strip()) > 0
    except Exception:
        return False


def render(text: str, out: Path) -> bool:
    out.parent.mkdir(parents=True, exist_ok=True)
    cmd = ["tts", "speak", "--text", text, "--output", str(out),
           "--voice", VOICE, "--speed", SPEED, "--format", "mp3",
           "--language", "en", "--timeout-secs", "300"]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        if r.returncode != 0:
            print(f"TTS FAILED {out.name}: {r.stderr[-300:]}", flush=True)
            return False
        return valid_mp3(out)
    except subprocess.TimeoutExpired:
        print(f"TTS TIMEOUT {out.name}", flush=True)
        return False


def main():
    clips = parse()
    print(f"parsed {len(clips)} dialogue clips", flush=True)
    OUT.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(clips, indent=1, ensure_ascii=False))

    done, failed, skipped = 0, [], 0
    for i, c in enumerate(clips, 1):
        parts = Path(c["path"]).parts          # ('public','audio','answers',N,prompt.mp3)
        out = BASE / "audio" / "answers" / parts[3] / parts[4]
        if valid_mp3(out):
            skipped += 1
            continue
        ok = render(c["text"], out)
        if ok:
            done += 1
            print(f"[{i}/{len(clips)}] OK {parts[3]}/{parts[4]}", flush=True)
        else:
            failed.append(c["path"])
            print(f"[{i}/{len(clips)}] FAIL {c['path']}", flush=True)

    with open(LOG, "a") as f:
        f.write(f"run: done={done} skipped={skipped} failed={len(failed)}\n")
        for p in failed:
            f.write(f"  FAIL {p}\n")
    print(f"DONE done={done} skipped={skipped} failed={len(failed)}", flush=True)
    if failed:
        print("FAILED PATHS:", flush=True)
        for p in failed:
            print("  " + p, flush=True)
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
