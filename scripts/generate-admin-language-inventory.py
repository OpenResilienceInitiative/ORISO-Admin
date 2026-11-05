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
    'src/pages/users', 'src/pages/Statistic', 'src/pages/Topics', 'src/pages/Links', 'src/pages/Logs',
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
                if str(file).startswith(('src/components/GlobalSettings/', 'src/components/Tenants/', 'src/pages/TenantSettings/', 'src/pages/GlobalSettings/', 'src/pages/Tenants/', 'src/pages/Agency/', 'src/pages/Profile/', 'src/pages/users/', 'src/pages/Topics/', 'src/pages/Links/')):
                    title = re.search(r'titleKey\s*(?:=|:)\s*["\']([^"\']+)["\']', line)
                    if title and title.group(1) in german and title.group(1) in english:
                        card_titles[title.group(1)].add((str(file), number))
                    translated_title = re.search(r'title\s*=\s*\{t\(\s*["\']([^"\']+)["\']', line)
                    if translated_title and translated_title.group(1) in german and translated_title.group(1) in english:
                        card_titles[translated_title.group(1)].add((str(file), number))
                    dynamic_title = re.search(r'titleKey\s*=\s*\{`([^`]*)`\}', line)
                    if dynamic_title:
                        parts = re.split(r'\$\{[^}]+\}', dynamic_title.group(1))
                        key_pattern = re.compile('^' + r'[^.]+'.join(map(re.escape, parts)) + '$')
                        for key in german.keys() & english.keys():
                            if key_pattern.match(key):
                                card_titles[key].add((str(file), number))
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
        'This source index lists locale keys referenced literally or by a recognisable prefix in the settings, organisation, account, user, statistics, topic, invitation and audit surfaces. The German and English text comes from the locale files. Paths point to the code using each key.', '',
        'This is an audit starting point, not a claim that every runtime label has been checked: other constructed keys, configured content, hardcoded text and role-dependent visibility need a separate review. Prefix matches may include keys unused by a particular variant. Some references supply a key to a shared component rather than rendering text directly.', '',
        'Refresh it with `python3 scripts/generate-admin-language-inventory.py`. The assistant locale overrides the main locale, as it does in the app.', '',
        '## Locale coverage', '',
        f'The merged locale files have {len(german)} German keys and {len(english)} English keys; {len(german.keys() - english.keys())} are German-only and {len(english.keys() - german.keys())} are English-only. This checks key presence, not translation quality or runtime coverage.', '',
        '## Settings tabs', '', 'These tabs are ordered as in the platform menu, with the Träger-only tabs included. Visibility depends on the role and configuration.', '',
        '<!-- prettier-ignore -->', '| German | English |', '| --- | --- |',
    ]
    output.extend(f'| {escape(german[key])} | {escape(english[key])} |' for key in menu_keys)
    list_columns = (
        ('Beratungsstellen / Counselling centres', 'src/pages/Agency/List/AgencyDataTable.tsx', ('agency.name', 'agency.list.id', 'agency.list.address', 'tenantName', 'topics.title', 'status', 'users.table.lastUpdated', 'userTable.columns.actions')),
        ('Träger / Providers', 'src/pages/Tenants/List/TenantDataTable.tsx', ('tenants.list.name', 'tenants.list.tenantId', 'tenants.list.subdomain', 'tenants.list.adminEmails', 'tenants.list.maxConsultants', 'tenants.list.created', 'users.table.lastUpdated', 'userTable.columns.actions')),
        ('Nutzer / Users', 'src/pages/users/management/UserDataTable.tsx', ('userTable.columns.name', 'tenantName', 'tenantAdmins.form.subdomain', 'agency', 'status', 'users.table.lastUpdated', 'userTable.columns.actions')),
        ('Themen / Topics', 'src/pages/Topics/List/TopicList.tsx', ('topic.name', 'topic.description', 'topic.internalIdentifier', 'status')),
        ('Einladungen / Invitations', 'src/pages/Links/inviteProgress/InviteProgressBoard.tsx', ('links.inviteProgress.col.recipient', 'links.inviteProgress.col.progress', 'links.inviteProgress.col.invitedAt', 'links.inviteProgress.col.lastActivity', 'links.inviteProgress.col.status', 'links.inviteProgress.col.actions')),
        ('E-Mail-Vorlagen / Email templates', 'src/pages/Links/EmailTemplatesDialog.tsx', ('links.templates.col.kind', 'links.templates.col.name', 'links.templates.col.language', 'links.templates.col.subject', 'links.templates.col.active', 'links.templates.col.actions')),
        ('CSV-Vorschau / CSV preview', 'src/pages/Links/InviteCsvImportModal.tsx', ('links.csvImport.col.status', 'links.accountInvites.email', 'links.accountInvites.firstName', 'links.composer.lastName', 'links.accountInvites.tenantId', 'links.accountInvites.agencyId', 'links.csvImport.col.target', 'links.composer.role', 'links.composer.template', 'links.composer.topics', 'links.composer.alsoCounsellor.label')),
        ('Tutorial-Statistik / Tutorial statistics', 'src/pages/Statistic/TutorialStatisticsSection.tsx', ('statistic.tutorials.table.tenant', 'statistic.tutorials.table.tour', 'statistic.tutorials.table.version', 'statistic.tutorials.table.surface', 'statistic.tutorials.table.audiences', 'statistic.tutorials.table.notStarted', 'statistic.tutorials.table.inProgress', 'statistic.tutorials.table.completed', 'statistic.tutorials.table.skipped', 'statistic.tutorials.table.completionRate')),
        ('Fallübergaben / Case handovers', 'src/pages/Logs/CaseHandoverLogs/index.tsx', ('caseHandoverLogs.table.createdAt', 'caseHandoverLogs.table.status', 'caseHandoverLogs.table.sessionId', 'caseHandoverLogs.table.requester', 'caseHandoverLogs.table.previous', 'caseHandoverLogs.table.reason', 'caseHandoverLogs.table.auditOutcome')),
        ('Löschprotokoll / Deletion audit', 'src/pages/Logs/DeletionAuditLogs/index.tsx', ('deletionAudit.table.createdAt', 'deletionAudit.table.outcome', 'deletionAudit.table.target', 'deletionAudit.table.targetType', 'deletionAudit.table.targetId', 'deletionAudit.table.tenantId', 'deletionAudit.table.actor', 'deletionAudit.table.actorRole', 'deletionAudit.table.actorId')),
        ('Inaktivitätsprotokoll / Inactivity audit', 'src/pages/Logs/InactiveAccountAuditLogs/index.tsx', ('inactiveAudit.table.createdAt', 'inactiveAudit.table.role', 'inactiveAudit.table.accountId', 'inactiveAudit.table.accountTenantId', 'inactiveAudit.table.lastActivityAt', 'inactiveAudit.table.thresholdDays', 'inactiveAudit.table.recipientEmail', 'inactiveAudit.table.recipientAdminId', 'inactiveAudit.table.emailDispatched')),
        ('Supervisionsprotokoll / Supervision log', 'src/pages/Logs/SupervisorLogs/index.tsx', ('logs.table.date', 'logs.table.action', 'logs.table.sessionId', 'logs.table.supervisor', 'logs.table.actor', 'logs.table.notes')),
    )
    output.extend(['', '## List columns', '', 'These columns come from the current table definitions. Some appear only for certain roles, features or screen widths; the action column has an accessible label rather than a visible heading.', '', '<!-- prettier-ignore -->', '| List | German | English | Code |', '| --- | --- | --- | --- |'])
    for label, path, keys in list_columns:
        de_names = ', '.join(escape(german[key]) for key in keys)
        en_names = ', '.join(escape(english[key]) for key in keys)
        output.append(f'| {label} | {de_names} | {en_names} | [{path}](../{path}) |')
    output.extend(['', '## Behaviour comparisons completed so far', '',
        'These checks compare the current wording with source code. They do not replace role-by-role checks in a running environment; all other settings remain to be reviewed.', '',
        '<!-- prettier-ignore -->', '| Setting | What the source confirms | Source |', '| --- | --- | --- |',
        '| Account inactivity | Automatic processing can be disabled or in dry-run; when active, advice-seeker-only accounts and staff accounts have different outcomes. | [UserService: AccountInactivityService](https://github.com/OpenResilienceInitiative/ORISO-UserService/blob/280585226f2c7308fcf35e1c4135bc2d4e43d051/src/main/java/de/caritas/cob/userservice/api/workflow/accountinactivity/AccountInactivityService.java), [scheduler](https://github.com/OpenResilienceInitiative/ORISO-UserService/blob/280585226f2c7308fcf35e1c4135bc2d4e43d051/src/main/java/de/caritas/cob/userservice/api/workflow/accountinactivity/AccountInactivityScheduler.java) |',
        '| Support address | Counsellors see the configured address when no centre admin is available for chat; an empty or invalid address does not produce an email link. | [Frontend: AgencyAdminContact](https://github.com/OpenResilienceInitiative/ORISO-Frontend/blob/8c5be36347f2a44e241892cafd0daed315e3119f/src/components/profile/AgencyAdminContact.tsx) |',
        '| Name and slogan | The selected organisation values are saved; the application uses them for page title and description metadata. | [Admin: NameAndSlogan](https://github.com/OpenResilienceInitiative/ORISO-Admin/blob/3896212d3285ca7f0af02b50282fc40987857382/src/components/Tenants/GeneralSettings/components/NameAndSlogan/index.tsx), [Frontend: useTenantTheming](https://github.com/OpenResilienceInitiative/ORISO-Frontend/blob/8c5be36347f2a44e241892cafd0daed315e3119f/src/utils/useTenantTheming.ts) |',
        '| Form of address | New advice-seeker accounts take an initial preference; changing the setting does not rewrite existing accounts. | [UserService: CreateUserFacade](https://github.com/OpenResilienceInitiative/ORISO-UserService/blob/280585226f2c7308fcf35e1c4135bc2d4e43d051/src/main/java/de/caritas/cob/userservice/api/facade/CreateUserFacade.java) |',
        '| Counsellor tutorials | The central switch controls availability; the practice release and planned controls are separate, and the latter cannot yet be saved here. | [Admin: tutorials card](https://github.com/OpenResilienceInitiative/ORISO-Admin/blob/3896212d3285ca7f0af02b50282fc40987857382/src/components/GlobalSettings/CounsellorTutorialSettingsCard/index.tsx), [Frontend: Help routes](https://github.com/OpenResilienceInitiative/ORISO-Frontend/blob/8c5be36347f2a44e241892cafd0daed315e3119f/src/components/profile/profileHelp.routes.ts) |',
        '| Further-counselling postcode | The request dialog either starts empty or uses the newest conversation with a postcode; missing or unknown mode selects prefill. | [Frontend: furtherCounsellingRules](https://github.com/OpenResilienceInitiative/ORISO-Frontend/blob/8c5be36347f2a44e241892cafd0daed315e3119f/src/components/furtherCounselling/furtherCounsellingRules.ts) |',
        '| Automatic translation | Platform admins save a provider key; without an explicit provider the service tries the configured OpenRouter key before Mistral. | [Admin: translation card](https://github.com/OpenResilienceInitiative/ORISO-Admin/blob/3896212d3285ca7f0af02b50282fc40987857382/src/components/GlobalSettings/TranslationApiKeysCard/index.tsx), [TenantService: TranslationFacade](https://github.com/OpenResilienceInitiative/ORISO-TenantService/blob/d8cbd0ae9db14018a6948888f29fb8790d35f3b9/src/main/java/com/vi/tenantservice/api/facade/TranslationFacade.java) |',
        '| Document master data | Operator details, review dates and figures are stored for documents; the displayed figures are entered with dates and not automatically imported from statistics. | [Admin: DocumentMasterDataCard](https://github.com/OpenResilienceInitiative/ORISO-Admin/blob/3896212d3285ca7f0af02b50282fc40987857382/src/components/GlobalSettings/DocumentMasterDataCard/index.tsx), [TenantService: TenantController](https://github.com/OpenResilienceInitiative/ORISO-TenantService/blob/d8cbd0ae9db14018a6948888f29fb8790d35f3b9/src/main/java/com/vi/tenantservice/api/controller/TenantController.java) |',
        '| Logo and favicon | The Admin stores logo, association logo and favicon; the Frontend applies the favicon and its stage test excludes a tenant logo from the stage. The DE/EN copy no longer promises a logo placement not confirmed by this check. | [Admin: LogoAndFavicon](https://github.com/OpenResilienceInitiative/ORISO-Admin/blob/3896212d3285ca7f0af02b50282fc40987857382/src/components/Tenants/GeneralSettings/components/LogoAndFavicon/index.tsx), [Frontend: stage test](https://github.com/OpenResilienceInitiative/ORISO-Frontend/blob/8c5be36347f2a44e241892cafd0daed315e3119f/src/components/stage/stage.test.tsx), [theming hook](https://github.com/OpenResilienceInitiative/ORISO-Frontend/blob/8c5be36347f2a44e241892cafd0daed315e3119f/src/utils/useTenantTheming.ts) |',
        '| System-message assistant | The Admin stores a display name and preset or uploaded icon; the card supports inheriting the higher-level icon. | [Admin: AssistantIdentity](https://github.com/OpenResilienceInitiative/ORISO-Admin/blob/3896212d3285ca7f0af02b50282fc40987857382/src/components/Tenants/GeneralSettings/components/AssistantIdentity/index.tsx), [Frontend: AssistantIdentity](https://github.com/OpenResilienceInitiative/ORISO-Frontend/blob/8c5be36347f2a44e241892cafd0daed315e3119f/src/components/carimat/AssistantIdentity.tsx) |',
        '| Available languages | German remains selected; adding a language produces a reminder to translate legal texts and topics. | [Admin: Languages](https://github.com/OpenResilienceInitiative/ORISO-Admin/blob/3896212d3285ca7f0af02b50282fc40987857382/src/components/Tenants/GeneralSettings/components/Languages/index.tsx) |',
        '| Appearance colours | The Admin provides a preview and stores selected appearance colours. | [Admin: ThemeBuilder](https://github.com/OpenResilienceInitiative/ORISO-Admin/blob/3896212d3285ca7f0af02b50282fc40987857382/src/components/Tenants/GeneralSettings/components/ThemeBuilder/index.tsx), [Frontend: useTenantTheming](https://github.com/OpenResilienceInitiative/ORISO-Frontend/blob/8c5be36347f2a44e241892cafd0daed315e3119f/src/utils/useTenantTheming.ts) |',
        '| Statistics settings | Platform admins can set minimum group sizes, snapshot freshness, report periods and message counting; changes are recorded in a downloadable log. | [Admin: StatisticsSettingsCard](https://github.com/OpenResilienceInitiative/ORISO-Admin/blob/3896212d3285ca7f0af02b50282fc40987857382/src/components/GlobalSettings/StatisticsSettingsCard/index.tsx), [UserService: StatisticsSettingsService](https://github.com/OpenResilienceInitiative/ORISO-UserService/blob/280585226f2c7308fcf35e1c4135bc2d4e43d051/src/main/java/de/caritas/cob/userservice/api/service/statistics/settings/StatisticsSettingsService.java) |',
        '| First response | The provider editor saves edited text and deadline, offers optional translation and leaves publication pending after translation failure. | [Admin: ErstantwortSettings](https://github.com/OpenResilienceInitiative/ORISO-Admin/blob/3896212d3285ca7f0af02b50282fc40987857382/src/components/Tenants/AppSettings/ErstantwortSettings/index.tsx), [Frontend: ErstantwortMessage](https://github.com/OpenResilienceInitiative/ORISO-Frontend/blob/8c5be36347f2a44e241892cafd0daed315e3119f/src/components/erstantwort/ErstantwortMessage.tsx) |',
        '| Temporary direct-link accounts | The account snapshots configured expiry values on creation; enabled cleanup processes due accounts. | [UserService: TemporaryAccountExpiryPolicy](https://github.com/OpenResilienceInitiative/ORISO-UserService/blob/280585226f2c7308fcf35e1c4135bc2d4e43d051/src/main/java/de/caritas/cob/userservice/api/service/temporaryaccount/TemporaryAccountExpiryPolicy.java), [scheduler](https://github.com/OpenResilienceInitiative/ORISO-UserService/blob/280585226f2c7308fcf35e1c4135bc2d4e43d051/src/main/java/de/caritas/cob/userservice/api/workflow/delete/scheduler/DeleteTemporaryAccountsScheduler.java) |',
        '| Temporary-account messages | Retention is recorded with the account; under guest choice an unanswered decision counts as not retaining messages. Enabled cleanup uses that decision. | [UserService: TemporaryAccountSnapshot](https://github.com/OpenResilienceInitiative/ORISO-UserService/blob/280585226f2c7308fcf35e1c4135bc2d4e43d051/src/main/java/de/caritas/cob/userservice/api/model/TemporaryAccountSnapshot.java), [cleanup](https://github.com/OpenResilienceInitiative/ORISO-UserService/blob/280585226f2c7308fcf35e1c4135bc2d4e43d051/src/main/java/de/caritas/cob/userservice/api/workflow/delete/service/DirectLinkTemporaryAccountCleanup.java) |',
        '| Appearance editing rights | Platform admins control whether provider admins may edit master data and appearance; while the stored policy is unknown the switch stays unavailable. | [Admin: EditingRightsCard](https://github.com/OpenResilienceInitiative/ORISO-Admin/blob/3896212d3285ca7f0af02b50282fc40987857382/src/components/Tenants/GeneralSettings/components/EditingRightsCard/index.tsx), [editing-rights hook](https://github.com/OpenResilienceInitiative/ORISO-Admin/blob/3896212d3285ca7f0af02b50282fc40987857382/src/hooks/useAppearanceEditingRights.hook.ts) |',
        '| Provider information | The platform provider-editing view stores basic provider details and optional sender and data-protection contact fields. | [Admin: provider editing](https://github.com/OpenResilienceInitiative/ORISO-Admin/blob/3896212d3285ca7f0af02b50282fc40987857382/src/pages/Tenants/Edit/General/index.tsx) |',
        '| System notices | An authorised platform admin prepares a draft, previews it, counts recipients and explicitly confirms; a changed count requires recounting. | [Admin: ServiceNoticeSend](https://github.com/OpenResilienceInitiative/ORISO-Admin/blob/3896212d3285ca7f0af02b50282fc40987857382/src/pages/TenantSettings/ServiceNotices/ServiceNoticeSend.tsx), [UserService: confirmation](https://github.com/OpenResilienceInitiative/ORISO-UserService/blob/280585226f2c7308fcf35e1c4135bc2d4e43d051/src/main/java/de/caritas/cob/userservice/api/service/servicenotice/ServiceNoticeConfirmation.java) |',
        '| Legal text management | The platform controls whether provider admins may manage legal text in the applicable configuration. | [Admin: LegalManagementCard](https://github.com/OpenResilienceInitiative/ORISO-Admin/blob/3896212d3285ca7f0af02b50282fc40987857382/src/components/Tenants/LegalSettings/components/LegalManagementCard/index.tsx) |',
        '| Data processing agreement | The legal settings page includes an agreement card; available actions depend on scope and permissions. | [Admin: LegalSettings](https://github.com/OpenResilienceInitiative/ORISO-Admin/blob/3896212d3285ca7f0af02b50282fc40987857382/src/components/Tenants/LegalSettings/index.tsx), [TenantService: TenantDpaFacade](https://github.com/OpenResilienceInitiative/ORISO-TenantService/blob/d8cbd0ae9db14018a6948888f29fb8790d35f3b9/src/main/java/com/vi/tenantservice/api/facade/TenantDpaFacade.java) |',
        '| Imprint and privacy notice | The legal settings page provides separate document cards; available editing and publication actions depend on scope and permissions. | [Admin: LegalSettings](https://github.com/OpenResilienceInitiative/ORISO-Admin/blob/3896212d3285ca7f0af02b50282fc40987857382/src/components/Tenants/LegalSettings/index.tsx), [LegalText](https://github.com/OpenResilienceInitiative/ORISO-Admin/blob/3896212d3285ca7f0af02b50282fc40987857382/src/components/Tenants/LegalSettings/components/LegalText/index.tsx) |',
        '| Same-topic conversations | On acceptance, the implemented mode attempts a notice for other accepted one-to-one conversations on the same topic; the other displayed modes are unavailable. | [UserService: TopicDuplicateService](https://github.com/OpenResilienceInitiative/ORISO-UserService/blob/280585226f2c7308fcf35e1c4135bc2d4e43d051/src/main/java/de/caritas/cob/userservice/api/service/furthercounselling/TopicDuplicateService.java) |',
        '| One department per counselling centre | Existing multiple topics can be retained or removed; adding a topic that leaves more than one is rejected while the restriction is on. | [AgencyService: OneTopicPerAgencyPolicy](https://github.com/OpenResilienceInitiative/ORISO-AgencyService/blob/51b17163632bb9997350d10bef93c1b49be6326f/src/main/java/de/caritas/cob/agencyservice/api/admin/service/OneTopicPerAgencyPolicy.java) |',
        '| Chat recovery | New account creation records the applicable method; anonymous users continue using recovery keys. | [UserService: enrollment policy](https://github.com/OpenResilienceInitiative/ORISO-UserService/blob/280585226f2c7308fcf35e1c4135bc2d4e43d051/src/main/java/de/caritas/cob/userservice/api/service/ChatRecoveryEnrollmentPolicyService.java), [Frontend: recovery policy](https://github.com/OpenResilienceInitiative/ORISO-Frontend/blob/8c5be36347f2a44e241892cafd0daed315e3119f/src/services/chatRecoveryPolicy.ts) |',
    ])
    output.extend(['', '## Titles in Admin components', '', 'Title keys in the mapped Admin components and their configuration, including dialogs, help sections and recognised templates. A component can be shared by multiple roles. This list is not yet complete for all dynamically supplied titles.', '', '<!-- prettier-ignore -->', '| German | English | Code |', '| --- | --- | --- |'])
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
