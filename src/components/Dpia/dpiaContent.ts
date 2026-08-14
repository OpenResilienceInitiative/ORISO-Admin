/**
 * Verified content for the DPIA document page overview sections.
 *
 * Every statement here is taken from a source that was checked against the code
 * base, not written for the mockup:
 *
 * - roles, realm roles, permission matrix and legal-text inheritance:
 *   `ORISO-Docs/product/roles-permissions.mdx`, sections 3.1 – 3.5
 * - counselling types and encryption: the verified DPIA long form in
 *   `0 - Docs/artifacts/dsfa-2026-08-13/dsfa-page-v1.html` (chapters 5.2, 5.3)
 * - appointments: ADR-020 "Scheduled calls, secure invitations, and a unified
 *   contact calendar" (Accepted, 2026-08-12) — planned, nothing shipped yet
 *
 * Nothing may be added here that is not backed by one of those sources.
 */
import type { DpiaIconName } from './DpiaIcon';

export type CompliancePreset = 'kdg' | 'dsgvo';

/** A norm citation that differs between the church (KDG) and the GDPR preset. */
export interface NormCitation {
    kdg: string;
    dsgvo: string;
}

export interface RoleTier {
    id: string;
    /** Visual tier, 1 = platform … 4 = counsellor. Drives the card's top rule. */
    tier: 1 | 2 | 3 | 4;
    icon: DpiaIconName;
    name: string;
    description: string;
    /** Keycloak realm roles this staff tier maps onto. */
    realmRoles: string[];
    /**
     * Whether this tier is prompted for 2FA. Not the same as non-bypassable — see
     * `mfaDeferrable`.
     */
    mfaMandatory: boolean;
    /**
     * Whether setup can be deferred. TRUE only for platform admins:
     * `platformAdminTwoFactorGate.ts` (App.tsx's `requiresPlatformAdminTwoFactor`
     * gate) explicitly returns `false` for anyone who is not a platform admin,
     * and lets a platform admin pick "set up later" and reach the normal
     * screens. Tenant admins get a SEPARATE, non-skippable step
     * (`TenantOnboarding/TwoFactorStep.tsx`, "Step 3 (#571): mandatory 2FA
     * setup for the freshly registered tenant admin") with no deferral option
     * at all — for them `mfaMandatory` really does mean enforced.
     */
    mfaDeferrable?: boolean;
}

/** Source: roles-permissions.mdx §3.3.1 – §3.3.4. */
export const ROLE_TIERS: RoleTier[] = [
    {
        id: 'platform-admin',
        tier: 1,
        icon: 'gear',
        name: 'Plattform-Admin',
        description:
            'Betreibt die Plattform, legt Träger an, verwaltet Beratende plattformweit und ' +
            'pflegt die Rechtstext-Vorlagen der Plattform-Ebene. Realm-Rollen agency-admin + ' +
            'tenant-admin mit Mandanten-ID 0 (useUserRoles.hook.ts: isSuperAdmin) identifizieren ' +
            'die Stufe; user-admin kommt dazu, weil ausschließlich diese Rolle Beratende ' +
            'anlegen/einladen darf (userRolesToPermissions.ts). Kann Chat-Inhalte technisch ' +
            'nicht einsehen.',
        realmRoles: ['agency-admin', 'tenant-admin', 'user-admin'],
        mfaMandatory: true,
        mfaDeferrable: true,
    },
    {
        id: 'tenant-admin',
        tier: 2,
        icon: 'house',
        name: 'Träger-Admin',
        description:
            'Verantwortet einen Träger: legt Beratungsstellen und deren Administration an, pflegt ' +
            'die Rechtstexte der Träger-Ebene. Von anderen Trägern vollständig isoliert.',
        realmRoles: ['tenant-admin', 'single-tenant-admin'],
        mfaMandatory: true,
    },
    {
        id: 'agency-admin',
        tier: 3,
        icon: 'person',
        name: 'Beratungsstellen-Admin',
        description:
            'Leitet eine Beratungsstelle: lädt Beratende ein, konfiguriert Live-Chat-Link, Themen ' +
            'und PLZ-Zuordnung, kann die Rechtstexte der eigenen Stelle überschreiben.',
        realmRoles: ['agency-admin', 'restricted-agency-admin', 'restricted-consultant-admin'],
        mfaMandatory: false,
    },
    {
        id: 'consultant',
        tier: 4,
        icon: 'speech-bubble-team',
        name: 'Beratende:r',
        description:
            'Nimmt Anfragen aus dem Warteraum an (älteste zuerst) und führt die verschlüsselte ' +
            'Beratung. Supervision ist eine Funktion an dieser Rolle, keine eigene Rolle.',
        realmRoles: ['consultant', 'group-chat-consultant', 'supervisor-consultant'],
        mfaMandatory: false,
    },
];

/** Cell verdicts of the permission matrix. `text` carries a qualified answer. */
export type MatrixCell = { kind: 'yes' } | { kind: 'no' } | { kind: 'e2ee' } | { kind: 'text'; text: string };

export interface MatrixRow {
    capability: string;
    /** One cell per role column, in the order of `MATRIX_COLUMNS`. */
    cells: MatrixCell[];
}

export const MATRIX_COLUMNS = ['Plattform-Admin', 'Träger-Admin', 'Stellen-Admin', 'Beratende:r', 'Ratsuchende:r'];

const yes: MatrixCell = { kind: 'yes' };
const no: MatrixCell = { kind: 'no' };
const e2ee: MatrixCell = { kind: 'e2ee' };
const text = (t: string): MatrixCell => ({ kind: 'text', text: t });

/** Source: roles-permissions.mdx §3.4 "The Permission Matrix". */
export const MATRIX_ROWS: MatrixRow[] = [
    { capability: 'Träger anlegen', cells: [yes, no, no, no, no] },
    { capability: 'Beratungsstellen anlegen', cells: [no, yes, no, no, no] },
    { capability: 'Beratende anlegen / einladen', cells: [yes, yes, yes, no, no] },
    {
        capability: 'Daten des eigenen Trägers sehen',
        cells: [text('n/a'), yes, text('nur eigene Stelle'), text('nur eigene Stelle'), no],
    },
    { capability: 'Daten anderer Träger sehen', cells: [no, no, no, no, no] },
    { capability: 'Rechtstexte Plattform-Ebene bearbeiten', cells: [yes, no, no, no, no] },
    { capability: 'Rechtstexte Träger-Ebene bearbeiten', cells: [no, yes, no, no, no] },
    { capability: 'Rechtstexte Stellen-Ebene bearbeiten', cells: [no, yes, yes, no, no] },
    { capability: 'Live-Chat-Links erzeugen', cells: [no, yes, yes, no, no] },
    { capability: 'Ticket aus dem Warteraum annehmen', cells: [no, no, no, yes, no] },
    { capability: 'Eigene Live-Chat-Verfügbarkeit schalten', cells: [no, no, no, yes, no] },
    {
        capability: 'Chat-Inhalte lesen',
        cells: [e2ee, e2ee, e2ee, text('nur eigene Sitzung'), text('nur eigene Sitzung')],
    },
    { capability: 'Löschung beim Verlassen', cells: [no, no, no, no, yes] },
    {
        // The two admin cells are deliberately different: deferral is a platform-admin-only
        // affordance (`platformAdminTwoFactorGate.ts` / App.tsx's `requiresPlatformAdminTwoFactor`
        // returns false outright for anyone else), while tenant admins get a separate,
        // non-skippable onboarding step (`TenantOnboarding/TwoFactorStep.tsx`, "Step 3 (#571):
        // mandatory 2FA setup") with no deferral at all — for them "Pflicht" is a real hard block.
        capability: '2FA erforderlich',
        cells: [text('Pflicht, Aufschub möglich'), text('Pflicht'), text('empfohlen'), text('empfohlen'), text('n/a')],
    },
];

/** Source: roles-permissions.mdx §3.5 "Inheritance of Legal Text". */
export const INHERITANCE_STEPS = [
    { name: 'Plattform-Vorlage', maintainer: 'Plattform-Admin' },
    { name: 'Träger-Fassung', maintainer: 'Träger-Admin' },
    { name: 'Fassung der Beratungsstelle', maintainer: 'Stellen-Admin' },
    { name: 'Wirksamer Text für Ratsuchende', maintainer: null },
];

export interface CounsellingType {
    id: string;
    icon: DpiaIconName;
    title: string;
    description: string;
    /** Set when the capability is designed but not shipped. */
    planned?: boolean;
}

/** Source: verified DPIA chapter 5.2; the appointment entry from ADR-020. */
export const COUNSELLING_TYPES: CounsellingType[] = [
    {
        id: 'one-to-one',
        icon: 'chat',
        title: '1:1-Chat',
        description:
            'Synchrone und asynchrone Beratung für registrierte Ratsuchende. Zugriff weiterer ' +
            'Beratender ausschließlich über das protokollierte Übergabeverfahren.',
    },
    {
        id: 'live-chat',
        icon: 'live-chats',
        title: 'Live-Einzelchat (anonym)',
        description:
            'Ohne Registrierung nutzbar; systemgenerierter, pseudonymer Benutzername. Anonyme ' +
            'Konten werden nach kurzer Frist automatisiert deaktiviert und gelöscht.',
    },
    {
        id: 'group-chat',
        icon: 'persons',
        title: 'Gruppenchat',
        description: 'Moderierte n:n-Beratung mit Terminangeboten je Gruppe; Ende-zu-Ende-verschlüsselt.',
    },
    {
        id: 'video',
        icon: 'video-call',
        title: 'Video-Beratung',
        description:
            'Browserbasiert (Element Call auf LiveKit-Infrastruktur) mit Medien-Ende-zu-Ende-' +
            'Verschlüsselung; es ist keine Aufzeichnung konfiguriert.',
    },
    {
        id: 'voice-message',
        icon: 'microphone',
        title: 'Sprachnachrichten',
        description: 'Kurze Audionachrichten in allen Chat-Formen, je Träger und Chat-Typ abschaltbar.',
    },
    {
        id: 'appointments',
        icon: 'calendar-check',
        title: 'Terminverwaltung',
        planned: true,
        description:
            'Nicht Bestandteil des aktuellen Leistungsumfangs. Geplant nach ADR-020; ausgeliefert ' +
            'ist davon bisher nichts.',
    },
];

/** Source: verified DPIA chapter 5.3 (Matrix Olm/Megolm, TLS, 2FA, anonymous wipe). */
export const TECHNICAL_MEASURES: { icon: DpiaIconName; label: string }[] = [
    { icon: 'lock', label: 'E2EE Olm / Megolm' },
    { icon: 'shield', label: 'TLS-Transportverschlüsselung' },
    { icon: 'verified', label: '2FA für Beratende' },
    { icon: 'hourglass', label: 'Anonyme Konten zeitgesteuert gelöscht' },
];

export interface KeyFigure {
    value: string;
    label: string;
}

/**
 * Sample figures for Storybook/preview only — NOT real release statistics.
 * `DpiaDocumentPage` renders these as its default `keyFigures` and marks them
 * as sample data in the UI (badge + footnote) whenever they are in use.
 *
 * The real, versioned numbers are meant to be injected via the `keyFigures`
 * prop from the DPIA operator master data (ORISO-Admin #735) once that feed
 * exists; wiring that data source is out of scope here — this only prepares
 * the seam so the caller can pass real figures in later.
 */
export const SAMPLE_KEY_FIGURES: KeyFigure[] = [
    { value: '12', label: 'Träger' },
    { value: '148', label: 'Beratungsstellen' },
    { value: '412', label: 'aktive Beratende' },
    { value: '9.640', label: 'registrierte Ratsuchende' },
];

/** Chapter list of the full document; the page renders the overview subset. */
export const CHAPTERS = [
    { id: 'kap1', label: 'Scope' },
    { id: 'kap2', label: 'Schwellwert' },
    { id: 'kap3', label: 'Kennzahlen' },
    { id: 'kap4', label: 'Akteure & Rollen' },
    { id: 'kap5', label: 'Technik' },
    { id: 'kap6', label: 'Statistik' },
    { id: 'kap7', label: 'Daten' },
    { id: 'kap8', label: 'Rechtsrahmen' },
    { id: 'kap9', label: 'Betroffenenrechte' },
    { id: 'kap10', label: 'Risiken' },
    { id: 'kap11', label: 'Ergebnis' },
];

/** Norm citations used by the overview sections. */
export const NORMS = {
    jointResponsibility: { kdg: '§ 28 Abs. 1 S. 2 KDG', dsgvo: 'Art. 26 Abs. 1 DSGVO' },
    dpiaDuty: { kdg: '§ 35 KDG', dsgvo: 'Art. 35 DSGVO' },
    consent: { kdg: '§ 8 Abs. 1 KDG', dsgvo: 'Art. 9 Abs. 2 lit. a DSGVO' },
} satisfies Record<string, NormCitation>;

export const PRESET_LABELS: Record<CompliancePreset, string> = {
    kdg: 'Kirchlicher Datenschutz (KDG)',
    dsgvo: 'DSGVO',
};
