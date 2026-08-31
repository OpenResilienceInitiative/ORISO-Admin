import type { Meta, StoryObj } from '@storybook/react-vite';
import { DpiaDocumentPage } from './DpiaDocumentPage';

/**
 * The living Datenschutz-Folgenabschätzung as a product surface.
 *
 * Layout follows the v3 mockups (2a desktop / 2b mobile): a sticky app bar with
 * the KDG/DSGVO switch, a header card, chapter chips for skimming, and every
 * chapter on its own card over a warm canvas. All statements come from the
 * verified sources — `ORISO-Docs/product/roles-permissions.mdx` for the roles
 * and the permission matrix, ADR-020 for the appointment module, which is
 * labelled as planned rather than shown as an existing feature.
 *
 * Follow-up (not in this change): port the eleven verified chapters and their
 * eighteen evidence dialogs from
 * `0 - Docs/artifacts/dsfa-2026-08-13/dsfa-page-v2.html` into chapter
 * components passed as `children`, and feed the operator master data from the
 * global settings instead of the props defaults.
 */
const meta = {
    title: 'Dpia/DpiaDocumentPage',
    component: DpiaDocumentPage,
    parameters: {
        layout: 'fullscreen',
    },
} satisfies Meta<typeof DpiaDocumentPage>;

export default meta;

type Story = StoryObj<typeof meta>;

// The named presets (phone/tablet/laptop/desktop) are registered once in .storybook/preview.tsx;
// selecting one for a story is done via `globals.viewport.value` (Storybook 10's viewport addon),
// NOT `parameters.viewport.defaultViewport` — the latter is a pre-10 API that this addon version
// silently ignores, so a story using it renders at whatever the toolbar happens to be set to
// instead of the viewport its name promises.

/** Desktop reading view — the default surface for reviewers and auditors. */
export const Desktop: Story = {
    globals: { viewport: { value: 'desktop', isRotated: false } },
};

/**
 * Phone 390. The app bar scrolls away while the chapter chips stay pinned, the
 * role cards and counselling types stack, and the permission matrix scrolls
 * inside its own container instead of widening the page.
 */
export const Mobile: Story = {
    globals: { viewport: { value: 'phone', isRotated: false } },
};

/** Church data-protection preset — all norm citations render KDG paragraphs. */
export const PresetKdg: Story = {
    args: { initialPreset: 'kdg' },
    globals: { viewport: { value: 'laptop', isRotated: false } },
};

/** GDPR preset — the same document with the secular citations. */
export const PresetDsgvo: Story = {
    args: { initialPreset: 'dsgvo' },
    globals: { viewport: { value: 'laptop', isRotated: false } },
};

/**
 * Internal annotations switched on: the ochre notes carry open questions and
 * source references for the editing team and never ship to a published PDF.
 */
export const WithInternalNotes: Story = {
    args: { initialShowInternalNotes: true },
    globals: { viewport: { value: 'laptop', isRotated: false } },
};
