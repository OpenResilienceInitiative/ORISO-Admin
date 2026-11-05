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
PATTERN = re.compile(r'''["']([^"'\n]+)["']''')
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
    card_titles = defaultdict(set)
    for root in ROOTS:
        path = Path(root)
        files = [path] if path.is_file() else (p for p in path.rglob('*') if p.suffix in ('.ts', '.tsx'))
        for file in files:
            if any(part in file.name for part in ('.test.', '.stories.', '.matrix.')):
                continue
            contents = file.read_text()
            constants = dict(re.findall(r"const (\w+) = ['\"]([^'\"]+)['\"]", contents))
            for number, line in enumerate(contents.splitlines(), 1):
                if line.lstrip().startswith(('//', '*', '{/*')):
                    continue
                if str(file).startswith(('src/components/GlobalSettings/', 'src/components/Tenants/GeneralSettings/', 'src/components/Tenants/AppSettings/')):
                    title = re.search(r'titleKey\s*=\s*["\']([^"\']+)["\']', line)
                    if title and title.group(1) in german and title.group(1) in english:
                        card_titles[title.group(1)].add((str(file), number))
                for match in PATTERN.finditer(line):
                    key = match.group(1)
                    if key in german and key in english:
                        references[key].add((str(file), number))
                for dynamic in re.finditer(r'\bt(?:<[^>]+>)?\(\s*`([^`]*)`', line):
                    template = dynamic.group(1)
                    for name, value in constants.items():
                        template = template.replace('${' + name + '}', value)
                    prefix = template.split('${', 1)[0]
                    if prefix and '${' in template:
                        for key in german.keys() & english.keys():
                            if key.startswith(prefix):
                                references[key].add((str(file), number))
    menu_keys = ('settings.subhead.globalConfig', 'settings.subhead.masterData', 'settings.subhead.view', 'settings.subhead.legal', 'settings.subhead.erstantwort', 'settings.subhead.smtp', 'serviceNotices.title', 'settings.subhead.functionAccess', 'tenants.edit.tabs.appSettings')
    output = [
        '# Admin settings and lists: language inventory', '',
        'This source index lists locale keys referenced literally or by a recognisable prefix in the settings, organisation, account, user, statistics, topic and invitation surfaces. The German and English text comes from the locale files. Paths point to the code using each key.', '',
        'This is an audit starting point, not a claim that every runtime label has been checked: other constructed keys, configured content, hardcoded text and role-dependent visibility need a separate review. Prefix matches may include keys unused by a particular variant. Some references supply a key to a shared component rather than rendering text directly.', '',
        'Refresh it with `python3 scripts/generate-admin-language-inventory.py`. The assistant locale overrides the main locale, as it does in the app.', '',
        '## Settings tabs', '', 'These tabs are ordered as in the platform menu, with the Träger-only tabs included. Visibility depends on the role and configuration.', '',
        '<!-- prettier-ignore -->', '| German | English |', '| --- | --- |',
    ]
    output.extend(f'| {escape(german[key])} | {escape(english[key])} |' for key in menu_keys)
    output.extend(['', '## Titles in settings components', '', 'Titles with literal locale keys in the global settings, tenant master-data, appearance and functionality components, including dialog titles. A component can be shared by multiple roles. This list is not yet complete for dynamically supplied titles.', '', '<!-- prettier-ignore -->', '| German | English | Code |', '| --- | --- | --- |'])
    for key, refs in sorted(card_titles.items(), key=lambda item: german[item[0]]):
        sources = ', '.join(f'[{escape(path)}:{line}](../{path}#L{line})' for path, line in sorted(refs))
        output.append(f'| {escape(german[key])} | {escape(english[key])} | {sources} |')
    output.extend(['', '## Source index', '', '<!-- prettier-ignore -->', '| Key | German | English | Source |', '| --- | --- | --- | --- |'])
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
