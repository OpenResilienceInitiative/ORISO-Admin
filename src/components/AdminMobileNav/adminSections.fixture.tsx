import { NavGlyph } from '../NavGlyph';
import type { AdminMobileNavSection } from './AdminMobileNav';

/**
 * The admin's real section tree, for stories and tests.
 *
 * Every subsection below exists as a route or a pill row in the app — the
 * settings subheads come from `constants/settingsTabs.ts`, the user sections
 * from `pages/users/management/UserSectionPills.tsx`, the link tabs and log
 * views from their routes in `App.tsx`. Nothing here is invented: a section
 * that looks empty in the navigation would be a wiring bug, not a design
 * decision, and this fixture is what makes that visible.
 *
 * Labels are the German strings from `locales/de/translation.json`; the real
 * bar takes its labels from i18n.
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
        // A tenant's edit page (App.tsx: /admin/tenants/:id/*).
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
        // App.tsx: /admin/agency/:id/*.
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
        // UserSectionPills — the "All Users" hub.
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
            { key: 'logs', label: 'Supervisor-Protokoll' },
            { key: 'inactive-accounts', label: 'Inaktive Konten' },
            { key: 'case-handover', label: 'Fallübergaben' },
        ],
    },
];

export const ADMIN_ACCOUNT_ITEMS = [
    { key: 'profile', label: 'Konto', icon: <NavGlyph name="profile" /> },
    { key: 'logout', label: 'Abmelden', icon: <NavGlyph name="logout" /> },
];
