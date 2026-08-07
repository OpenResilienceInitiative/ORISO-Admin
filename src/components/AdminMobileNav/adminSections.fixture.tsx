import { NavGlyph } from '../NavGlyph';
import type { AdminMobileNavSection } from './AdminMobileNav';

/**
 * What the second row must offer, per page.
 *
 * Audited against the code on 2026-08-07, not assumed — a nav that shows a
 * search on a page that has none, or hides the create action on a page that has
 * one, is a wiring bug we would only find after merging. `source` names the file
 * the finding comes from so the next person can re-check it.
 */
export interface SecondRowCapabilities {
    search: boolean;
    add: boolean;
    /** A filter/config row beyond plain search. */
    filters: boolean;
    source: string;
    note?: string;
}

export const SECOND_ROW_BY_PAGE: Record<string, SecondRowCapabilities> = {
    'settings/*': {
        search: false,
        add: false,
        filters: false,
        source: 'pages/TenantSettings + constants/settingsTabs.ts',
        note: 'Settings subsections are forms — no search, no create.',
    },
    tenants: {
        search: true,
        add: true,
        filters: false,
        source: 'pages/Tenants/List/index.tsx:198',
    },
    'tenants/:id/*': {
        search: false,
        add: false,
        filters: false,
        source: 'App.tsx tenant edit routes',
    },
    agencies: {
        search: true,
        add: true,
        filters: false,
        source: 'pages/Agency/List/index.tsx:332',
        note: 'Create is permission-gated and blocked while the DPA is unsigned.',
    },
    'agencies/:id/*': { search: false, add: false, filters: false, source: 'App.tsx agency edit routes' },
    users: {
        search: true,
        add: true,
        filters: false,
        source: 'pages/users/management/UserManagementTable.tsx:321',
        note: 'Same controls for all four user groups.',
    },
    topics: {
        search: true,
        add: true,
        filters: true,
        source: 'pages/Topics/List/TopicList.tsx:184',
        note: 'Create is permission-gated; there is also a topic switch.',
    },
    statistics: {
        search: true,
        add: false,
        filters: true,
        source: 'pages/Statistic.tsx:1859',
        note: 'Search is expanded by default and belongs to the dashboard filters.',
    },
    'logs/supervisor': { search: false, add: false, filters: false, source: 'pages/Logs/SupervisorLogs' },
    'logs/inactive-accounts': {
        search: true,
        add: false,
        filters: true,
        source: 'pages/Logs/InactiveAccountAuditLogs/index.tsx:114',
        note: 'Account-id search plus a role select and a reset button. No create.',
    },
    'logs/case-handover': { search: false, add: false, filters: false, source: 'pages/Logs/CaseHandoverLogs' },
    'links/invites': {
        search: true,
        add: true,
        filters: true,
        source: 'pages/Links/AccountInvitesTab.tsx + InviteComposer.tsx:382',
        note: 'The complex one: template picker, bulk actions, CSV import, composer with e-mail field.',
    },
    'links/external-inbounds': {
        search: false,
        add: true,
        filters: false,
        source: 'pages/Links/ExternalInboundsTab.tsx:215',
        note: '"Create link" only.',
    },
};

/**
 * The admin's real section tree.
 *
 * Every subsection exists as a route or a pill row in the app — settings
 * subheads from `constants/settingsTabs.ts`, user groups from
 * `pages/users/management/UserSectionPills.tsx`, link tabs and log views from
 * their routes in `App.tsx`. Labels are the German strings from
 * `locales/de/translation.json`; the real bar takes them from i18n.
 */
export const ADMIN_SECTIONS: AdminMobileNavSection[] = [
    {
        key: 'settings',
        label: 'Einstellungen',
        icon: <NavGlyph name="displaySettings" />,
        subsections: [
            { key: 'globalConfig', label: 'Globale Konfigurationen' },
            { key: 'masterData', label: 'Stammdaten & Mehr' },
            { key: 'view', label: 'Erscheinungsbild' },
            { key: 'legal', label: 'Rechtliches' },
            { key: 'smtp', label: 'Email Server' },
            { key: 'permissions', label: 'Berechtigungen' },
            { key: 'functionAccess', label: 'Funktionszugriff' },
        ],
    },
    {
        key: 'tenants',
        label: 'Träger',
        icon: <NavGlyph name="tenants" />,
        subsections: [
            { key: 'general', label: 'Allgemein' },
            { key: 'theme-settings', label: 'Erscheinungsbild' },
            { key: 'legal-settings', label: 'Rechtliches' },
            { key: 'app-settings', label: 'App-Einstellungen' },
            { key: 'global-settings', label: 'Globale Einstellungen' },
        ],
    },
    {
        key: 'agencies',
        label: 'Beratungstellen',
        icon: <NavGlyph name="counseling" />,
        subsections: [
            { key: 'general', label: 'Allgemein' },
            { key: 'legal-settings', label: 'Rechtliches' },
            { key: 'functionalities', label: 'Funktionen' },
        ],
    },
    {
        key: 'users',
        label: 'Nutzende',
        icon: <NavGlyph name="users" />,
        subsections: [
            { key: 'platform-admins', label: 'Platform Admin' },
            { key: 'tenant-admins', label: 'Träger Admin' },
            { key: 'agency-admins', label: 'Berater*innen Admins' },
            { key: 'consultants', label: 'Berater*innen' },
        ],
    },
    { key: 'topics', label: 'Themen', icon: <NavGlyph name="topics" /> },
    { key: 'statistics', label: 'Statistik', icon: <NavGlyph name="statistics" /> },
    {
        key: 'links',
        label: 'Links',
        icon: <NavGlyph name="links" />,
        subsections: [
            { key: 'tenants', label: 'Träger-Invites' },
            { key: 'counsellor', label: 'Berater-Invites' },
            { key: 'external-inbounds', label: 'Externe Inbounds' },
        ],
    },
    {
        key: 'logs',
        label: 'Logs',
        icon: <NavGlyph name="logs" />,
        subsections: [
            { key: 'supervisor', label: 'Supervisor-Protokoll' },
            { key: 'inactive-accounts', label: 'Inaktive Konten' },
            { key: 'case-handover', label: 'Fallübergaben' },
        ],
    },
];

export const ADMIN_ACCOUNT_ITEMS = [
    { key: 'profile', label: 'Konto', icon: <NavGlyph name="profile" /> },
    { key: 'logout', label: 'Abmelden', icon: <NavGlyph name="logout" /> },
];

/** Maps the bar's (section, subsection) pair onto the audit table above. */
export const capabilitiesFor = (sectionKey: string, subsectionKey?: string): SecondRowCapabilities => {
    const direct = SECOND_ROW_BY_PAGE[`${sectionKey}/${subsectionKey}`];

    if (direct) {
        return direct;
    }

    if (sectionKey === 'links') {
        return SECOND_ROW_BY_PAGE[subsectionKey === 'external-inbounds' ? 'links/external-inbounds' : 'links/invites'];
    }

    if (sectionKey === 'settings') {
        return SECOND_ROW_BY_PAGE['settings/*'];
    }

    return (
        SECOND_ROW_BY_PAGE[sectionKey] ?? {
            search: false,
            add: false,
            filters: false,
            source: 'not audited',
        }
    );
};
