#!/usr/bin/env python3
"""Refresh the literal-key source index for the Admin settings and lists."""
import argparse
import json
import re
from collections import defaultdict
from pathlib import Path

ROOTS = (
    'src/components/GlobalSettings', 'src/components/Tenants', 'src/pages/TenantSettings',
    'src/pages/GlobalSettings', 'src/pages/Tenants', 'src/pages/Agency', 'src/pages/Profile',
    'src/pages/users', 'src/pages/Statistic', 'src/pages/Topics', 'src/pages/Links',
    'src/constants/settingsTabs.ts', 'src/components/DataTable',
)
PATTERN = re.compile(r'''(?:\bt(?:<[^>]+>)?\(\s*|(?:titleKey|subTitleKey|labelKey)\s*[:=]\s*)["']([^"']+)["']''')
OUTPUT = Path('docs/admin-settings-language-inventory.md')


def locales(language):
    values = json.loads(Path(f'src/locales/{language}/translation.json').read_text())
    values.update(json.loads(Path(f'src/locales/{language}/assistant.json').read_text()))
    return values


def escape(value):
    return str(value).replace('|', r'\|').replace('\n', ' ').replace('<', '&lt;').replace('>', '&gt;')


def render():
    german, english = locales('de'), locales('en')
    references = defaultdict(set)
    for root in ROOTS:
        path = Path(root)
        files = [path] if path.is_file() else (p for p in path.rglob('*') if p.suffix in ('.ts', '.tsx'))
        for file in files:
            if any(part in file.name for part in ('.test.', '.stories.', '.matrix.')):
                continue
            for number, line in enumerate(file.read_text().splitlines(), 1):
                if line.lstrip().startswith(('//', '*', '{/*')):
                    continue
                for match in PATTERN.finditer(line):
                    key = match.group(1)
                    if key in german and key in english:
                        references[key].add((str(file), number))
    output = [
        '# Admin settings and lists: language inventory', '',
        'This source index lists literal translation keys used by the settings, organisation, account, user, statistics, topic and invitation surfaces. The German and English text comes from the locale files. Paths point to the code using each key.', '',
        'This is an audit starting point, not a claim that every runtime label has been checked: dynamically constructed keys, configured content, hardcoded text and role-dependent visibility need a separate review.', '',
        'Refresh it with `python3 scripts/generate-admin-language-inventory.py`. The assistant locale overrides the main locale, as it does in the app.', '',
        '<!-- prettier-ignore -->', '| Key | German | English | Source |', '| --- | --- | --- | --- |',
    ]
    for key, refs in sorted(references.items()):
        sources = ', '.join(f'[{escape(path)}:{line}](../{path}#L{line})' for path, line in sorted(refs))
        output.append(f'| `{escape(key)}` | {escape(german[key])} | {escape(english[key])} | {sources} |')
    return '\n'.join(output) + '\n'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true', help='fail if the saved inventory is stale')
    args = parser.parse_args()
    content = render()
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text() != content:
            raise SystemExit('Inventory is stale; rerun this script.')
    else:
        OUTPUT.write_text(content)


if __name__ == '__main__':
    main()
