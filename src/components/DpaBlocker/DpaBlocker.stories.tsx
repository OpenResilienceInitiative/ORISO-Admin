import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { DpaBlocker } from './DpaBlocker';

const SHORT_DPA = JSON.stringify({
    de: '<h2>Auftragsverarbeitungsvertrag</h2><p>Zwischen dem Plattformbetreiber und Ihrer Organisation wird der folgende Vertrag über die Verarbeitung personenbezogener Daten geschlossen.</p><p>§ 1 Gegenstand: Der Betreiber verarbeitet personenbezogene Daten ausschließlich im Auftrag und nach Weisung der Organisation.</p>',
    en: '<h2>Data processing agreement</h2><p>The platform operator and your organisation conclude the following agreement on the processing of personal data.</p><p>Section 1 Subject: the operator processes personal data exclusively on behalf of and under the instructions of the organisation.</p>',
});

// 10 sections x 4 paragraphs: long enough for the #572 scroll acceptance AND
// multi-section, so the canonical chapter chips (AnchorChips) kick in.
const longSections = Array.from(
    { length: 10 },
    (_, i) =>
        `<h2>§ ${i + 1} Abschnitt ${i + 1}</h2>${Array.from(
            { length: 4 },
            () =>
                `<p>Die Vertragsparteien vereinbaren, dass sämtliche personenbezogenen Daten ausschließlich zur Erfüllung des vereinbarten Zwecks verarbeitet werden. Technische und organisatorische Maßnahmen sind nach Art. 32 DSGVO zu treffen, regelmäßig zu prüfen und zu dokumentieren. Unterauftragsverhältnisse bedürfen der vorherigen Zustimmung.</p>`,
        ).join('')}`,
).join('');

const LONG_DPA = JSON.stringify({
    de: `<h1>Auftragsverarbeitungsvertrag (Langfassung)</h1>${longSections}`,
    en: `<h1>Data processing agreement (long version)</h1>${longSections}`,
});

/**
 * Global non-bypassable DPA blocker (TEN-INV-U10, #572, parent #569).
 * Rendered by `DpaBlockerGate` INSTEAD of every admin route after a
 * successful login while the tenant's DPA is unsigned/outdated: only
 * viewing/signing the DPA, retrying the status check and logging out are
 * possible.
 *
 * Surfaces follow the reference sheet (Organisms/Modal, #594.8): a neutral
 * `--m3-surface-container-high` card, fields tonal with it, accent only on the
 * actions. Exactly ONE scroller — the card body from 1200px up (so the card is
 * genuinely centred), the overlay below that; check MobileLongDpaText at
 * 390x844.
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
 * Long multi-section DPA on desktop (#594.1): the canonical read-only reader
 * carries the chapter chips; picking one scrolls inside the text region and
 * moves keyboard focus to that section.
 */
export const DesktopLongDpaTextWithChapters: Story = {
    args: { reason: 'UNSIGNED', signable: true, dpaContent: LONG_DPA },
};

/**
 * #572 scroll-behaviour acceptance: extra-long DPA text at 390x844 — the
 * overlay is the single scroller for the full text + form while
 * sign/retry/logout stay reachable; the app behind is scroll-locked (body
 * overflow). The chapter chips pin themselves to the bottom of the viewport
 * while the agreement is on screen and scroll sideways with their own arrows.
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

/**
 * #594.9 regression: opening the reader's fullscreen mode from INSIDE the
 * blocker used to make the agreement disappear — antd paints modals at
 * z-index 1000 while this overlay owns 1300, so the dialog was drawn behind an
 * opaque surface and even its close button was unclickable. The dialog now
 * declares a level above every application overlay
 * (`EDITOR_FULLSCREEN_Z_INDEX`), which fixes it for every consumer at once.
 */
export const FullscreenReaderOverTheBlocker: Story = {
    args: { reason: 'UNSIGNED', signable: true, dpaContent: LONG_DPA },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole('button', { name: /maximi/i }));
        const dialog = await waitFor(() => {
            const node = document.querySelector('.ant-modal-wrap');
            if (!node) throw new Error('fullscreen dialog did not open');
            return node as HTMLElement;
        });
        // Visible means: above the blocker overlay, not merely mounted.
        await expect(Number(dialog.style.zIndex)).toBeGreaterThan(1300);
        await expect(dialog.querySelector('.ProseMirror')?.textContent ?? '').toContain('Abschnitt 1');
    },
};
