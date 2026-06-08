#!/usr/bin/env python3
"""Merge English translations for keys referenced in source code."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EN_PATH = ROOT / "src/locales/en/translation.json"
DE_PATH = ROOT / "src/locales/de/translation.json"
MANUAL_PATH = ROOT / "scripts/en-translations-manual.json"

KEY_SUFFIXES = (
    "titleKey",
    "subTitleKey",
    "placeholderKey",
    "labelKey",
    "saveKey",
    "cancelKey",
    "tooltipKey",
    "shortLabelKey",
    "headlineKey",
    "messageKey",
    "descriptionKey",
    "textKey",
    "confirmKey",
    "okKey",
    "errorKey",
    "successKey",
    "warningKey",
    "infoKey",
    "buttonKey",
    "tabKey",
    "navKey",
    "helpKey",
    "hintKey",
)
KEY_PROP_PATTERN = re.compile(
    rf"(?:{'|'.join(KEY_SUFFIXES)})(?:=|:)\s*['\"]([^'\"]+)['\"]"
)
KEY_PATTERNS = [
    re.compile(r"\bt\(\s*'([^']+)'"),
    re.compile(r'\bt\(\s*"([^"]+)"'),
    KEY_PROP_PATTERN,
]


def collect_used_keys() -> set[str]:
    keys: set[str] = set()
    for path in ROOT.rglob("*.ts*"):
        if "node_modules" in path.parts or "locales" in path.parts:
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        for pattern in KEY_PATTERNS:
            keys.update(match.group(1) for match in pattern.finditer(text))
    return keys


def main() -> None:
    en = json.loads(EN_PATH.read_text(encoding="utf-8"))
    de = json.loads(DE_PATH.read_text(encoding="utf-8"))
    manual = json.loads(MANUAL_PATH.read_text(encoding="utf-8")) if MANUAL_PATH.exists() else {}

    used_keys = collect_used_keys()
    missing = sorted(key for key in used_keys if key not in en)

    added = 0
    updated = 0
    for key in missing:
        if key in manual:
            en[key] = manual[key]
            added += 1
            continue
        if key in de:
            # Keep key visible during rollout; manual file should override these.
            en[key] = de[key]
            added += 1

    for key, value in manual.items():
        if en.get(key) != value:
            en[key] = value
            updated += 1

    EN_PATH.write_text(json.dumps(en, ensure_ascii=False, indent=4) + "\n", encoding="utf-8")
    print(f"Added {added} keys, updated {updated} manual overrides ({len(manual)} manual entries).")


if __name__ == "__main__":
    main()
