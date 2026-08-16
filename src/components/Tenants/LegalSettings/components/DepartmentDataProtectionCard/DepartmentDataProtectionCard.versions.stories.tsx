import type { Meta, StoryObj } from '@storybook/react-vite';
import { DepartmentDataProtectionCard } from './index';

/**
 * Version look-back and the consent field on a NON-AVV legal card
 * (Fachbereich data-protection policy) — ADR-021 decisions 3 and 4. Open the
 * clock split button in the lower function bar to browse the published
 * versions read-only; "adopt as new draft" copies one into the draft.
 */
const meta = {
    title: 'Organisms/Legal/DepartmentDataProtectionCard/Versions & Consent',
    component: DepartmentDataProtectionCard,
    parameters: { layout: 'padded' },
    args: { onSave: () => undefined, departmentName: 'Suchtberatung', languages: ['de'] },
} satisfies Meta<typeof DepartmentDataProtectionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const versions = [
    {
        activationDate: '2026-07-13T10:22:00Z',
        content: JSON.stringify({
            de: '<h1>Datenschutzerklärung</h1><p>Fassung vom 13. Juli 2026 — aktuell online.</p>',
        }),
    },
    {
        activationDate: '2026-05-02T09:00:00Z',
        content: JSON.stringify({
            de: '<h1>Datenschutzerklärung</h1><p>Fassung vom 2. Mai 2026 — abgelöst.</p>',
        }),
    },
    {
        activationDate: '2026-01-15T08:30:00Z',
        content: JSON.stringify({
            de: '<h1>Datenschutzerklärung</h1><p>Erste veröffentlichte Fassung vom 15. Januar 2026.</p>',
        }),
    },
];

/** Three published versions, browsable through the editor's version select. */
export const WithVersionHistory: Story = {
    args: {
        publicationStatus: 'PUBLISHED',
        initialContentByLanguage: {
            de: '<h1>Datenschutzerklärung</h1><p>Fassung vom 13. Juli 2026 — aktuell online.</p>',
        },
        versions,
    },
};

/**
 * A version that was never stored in the language being edited is still
 * readable, but cannot be adopted as a draft (that would copy a foreign
 * language into this one).
 */
export const VersionMissingInActiveLanguage: Story = {
    args: {
        publicationStatus: 'PUBLISHED',
        languages: ['de', 'en'],
        defaultLanguage: 'en',
        initialContentByLanguage: { de: '<p>Deutsche Fassung</p>', en: '<p>English version</p>' },
        versions,
    },
};

/** Version history plus the consent sentence that belongs to the policy. */
export const WithConsentField: Story = {
    args: {
        publicationStatus: 'PUBLISHED',
        initialContentByLanguage: { de: '<h1>Datenschutzerklärung</h1><p>Fachbereich Suchtberatung.</p>' },
        versions,
        consentByLanguage: {
            de: 'Ich habe die {{legal_links}} der {{Beratungsstelle}} zum Thema {{Thema}} zur Kenntnis genommen.',
        },
    },
};

/**
 * The blocked-publication state: the stored consent sentence lacks
 * `{{legal_links}}`. Pressing "Veröffentlichen" refuses and names the affected
 * languages instead of sending a request the server would reject.
 */
export const ConsentBlocksPublication: Story = {
    args: {
        publicationStatus: 'PUBLISHED',
        initialContentByLanguage: { de: '<h1>Datenschutzerklärung</h1><p>Fachbereich Suchtberatung.</p>' },
        versions,
        consentByLanguage: { de: 'Ich bin mit der Verarbeitung meiner Daten einverstanden.' },
    },
};
