import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { fn } from 'storybook/test';
import { DpaBlocker } from './DpaBlocker';

const SHORT_DPA = JSON.stringify({
    de: '<h2>Auftragsverarbeitungsvertrag</h2><p>Zwischen dem Plattformbetreiber und Ihrer Organisation wird der folgende Vertrag über die Verarbeitung personenbezogener Daten geschlossen.</p><p>§ 1 Gegenstand: Der Betreiber verarbeitet personenbezogene Daten ausschließlich im Auftrag und nach Weisung der Organisation.</p>',
    en: '<h2>Data processing agreement</h2><p>The platform operator and your organisation conclude the following agreement on the processing of personal data.</p><p>Section 1 Subject: the operator processes personal data exclusively on behalf of and under the instructions of the organisation.</p>',
});

const longParagraphs = Array.from(
    { length: 40 },
    (_, i) =>
        `<p>§ ${
            i + 1
        } Die Vertragsparteien vereinbaren, dass sämtliche personenbezogenen Daten ausschließlich zur Erfüllung des vereinbarten Zwecks verarbeitet werden. Technische und organisatorische Maßnahmen sind nach Art. 32 DSGVO zu treffen, regelmäßig zu prüfen und zu dokumentieren. Unterauftragsverhältnisse bedürfen der vorherigen Zustimmung.</p>`,
).join('');

const LONG_DPA = JSON.stringify({
    de: `<h2>Auftragsverarbeitungsvertrag (Langfassung)</h2>${longParagraphs}`,
    en: `<h2>Data processing agreement (long version)</h2>${longParagraphs}`,
});

/**
 * Global non-bypassable DPA blocker (TEN-INV-U10, #572, parent #569).
 * Rendered by `DpaBlockerGate` INSTEAD of every admin route after a
 * successful login while the tenant's DPA is unsigned/outdated: only
 * viewing/signing the DPA, retrying the status check and logging out are
 * possible. The overlay itself scrolls (no fixed height with hidden
 * overflow) — check the MobileLongDpaText story at 390x844.
 */
const meta = {
    title: 'Organisms/DpaBlocker',
    component: DpaBlocker,
    parameters: { layout: 'fullscreen' },
    args: {
        onSign: fn(),
        onRetry: fn(),
        onLogout: fn(),
    },
} satisfies Meta<typeof DpaBlocker>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Tenant never signed: full DPA text plus the existing sign form. */
export const Unsigned: Story = {
    args: { reason: 'UNSIGNED', signable: true, dpaContent: SHORT_DPA },
};

/** A newer DPA version was published: same form, outdated-specific intro. */
export const Outdated: Story = {
    args: { reason: 'OUTDATED', signable: true, dpaContent: SHORT_DPA },
};

/** No DPA published for the tenant yet — nothing to sign, retry/logout only. */
export const Missing: Story = {
    args: { reason: 'MISSING', signable: false },
};

/** Technically inconsistent contract data — distinct message, retry/logout only. */
export const Inconsistent: Story = {
    args: { reason: 'INCONSISTENT', signable: false },
};

/** The status check failed — the gate fails closed with a retry state. */
export const StatusUnavailable: Story = {
    args: { reason: 'STATUS_UNAVAILABLE', signable: false },
};

/** Signing failed (e.g. 502 from the service) — inline error, block stays. */
export const SignFailed: Story = {
    args: { reason: 'UNSIGNED', signable: true, dpaContent: SHORT_DPA, signFailed: true },
};

/** Signable, but the published DPA text could not be loaded. */
export const ContentUnavailable: Story = {
    args: { reason: 'UNSIGNED', signable: true, dpaContent: null },
};

/**
 * #572 scroll-behaviour acceptance: extra-long DPA text at 390x844 — the
 * overlay scrolls the full text + form while sign/retry/logout stay
 * reachable; the app behind is scroll-locked (body overflow).
 */
export const MobileLongDpaText: Story = {
    args: { reason: 'UNSIGNED', signable: true, dpaContent: LONG_DPA },
    parameters: {
        viewport: {
            options: {
                phone390: { name: 'Phone 390×844', styles: { width: '390px', height: '844px' } },
            },
        },
    },
    globals: { viewport: { value: 'phone390', isRotated: false } },
};
