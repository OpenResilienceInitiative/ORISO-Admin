import type { Meta, StoryObj } from '@storybook/react-vite';
import { DataProcessingAgreementCard } from './index';

const meta = {
    title: 'Organisms/Legal/DataProcessingAgreementCard',
    component: DataProcessingAgreementCard,
    parameters: { layout: 'padded' },
    // Storybook has no JWT, so the role for the help texts is pinned explicitly.
    args: { onPublish: () => undefined, helpRole: 'platform' },
} satisfies Meta<typeof DataProcessingAgreementCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Each version carries its COMPLETE stored map — the card picks the active language
// (the May version was never translated, so English falls back to its German text).
const versions = [
    {
        id: '2026-07-13T10:22',
        label: '13. Jul 2026 – 10:22 (aktuell)',
        content: JSON.stringify({
            de:
                '<h1>Auftragsverarbeitungsvertrag</h1>' +
                '<p>Aktuelle Fassung. Weisungsbindung, Vertraulichkeit, TOMs, Löschung/Rückgabe.</p>',
            en:
                '<h1>Data processing agreement</h1>' +
                '<p>Current version. Instruction binding, confidentiality, TOMs, deletion/return.</p>',
        }),
    },
    {
        id: '2026-05-02T09:00',
        label: '2. Mai 2026 – 09:00',
        content: JSON.stringify({
            de: '<h1>Auftragsverarbeitungsvertrag</h1><p>Ältere Fassung vom Mai 2026.</p>',
        }),
    },
];

/**
 * Saved versions are browsable via the editor's version select (top right): picking one
 * shows it read-only with a banner; "restore" copies its text into the current draft.
 */
export const WithHistory: Story = {
    args: {
        initialContentByLanguage: {
            de: '<h1>Auftragsverarbeitungsvertrag</h1><p>Aktueller Entwurf, bereit zum Veröffentlichen …</p>',
            en: '<h1>Data processing agreement</h1><p>Current draft, ready to publish …</p>',
        },
        languages: ['de', 'en'],
        defaultLanguage: 'de',
        versions,
    },
};

export const FirstPublish: Story = {
    args: {
        initialContentByLanguage: {},
        languages: ['de'],
        versions: [],
    },
};

/**
 * Language selector with status labels: German is the source ("Deutsch (Original)"),
 * English was machine-translated ("Englisch (maschinell übersetzt)" — from its `__meta`
 * entry). The publish button opens the translate-on-publish modal (mocked translate call).
 */
export const WithMachineTranslatedLanguage: Story = {
    args: {
        initialContentByLanguage: {
            de: '<h1>Auftragsverarbeitungsvertrag</h1><p>Deutscher Originaltext …</p>',
            en: '<h1>Data processing agreement</h1><p>Machine-translated English text …</p>',
            en__meta: '{"mt":true,"src":"de","at":"2026-07-01T10:00:00Z"}',
        },
        languages: ['de', 'en', 'fr'],
        defaultLanguage: 'de',
        versions: [],
        onTranslate: async ({ targetLangs }) => ({
            translations: Object.fromEntries(
                targetLangs.map((lang) => [lang, { content: `<p>[${lang}] machine translation …</p>` }]),
            ),
            provider: 'openrouter',
            model: 'demo',
        }),
    },
};

export const ReadOnly: Story = {
    args: {
        initialContentByLanguage: {
            de: '<h1>Auftragsverarbeitungsvertrag</h1><p>Veröffentlichte Fassung — auf Träger-Ebene verwaltet.</p>',
            en: '<h1>Data processing agreement</h1><p>Published version — managed at tenant level.</p>',
        },
        languages: ['de', 'en'],
        defaultLanguage: 'de',
        versions,
        readOnly: true,
    },
};

/**
 * The draft action (ORISO-Admin#708): "Entwurf bearbeiten" sits next to
 * "Veröffentlichen" so unfinished wording can be parked without stamping a new
 * published DPA version that every tenant would have to sign again.
 */
export const WithDraftAction: Story = {
    args: {
        initialContentByLanguage: {
            de: '<h1>Auftragsverarbeitungsvertrag</h1><p>Halbfertiger Text, noch nicht zum Veröffentlichen …</p>',
        },
        languages: ['de'],
        defaultLanguage: 'de',
        versions,
        onSaveDraft: () => undefined,
        onDiscardDraft: () => undefined,
    },
};

/** A restored draft: the notice names the save time and that it is device-local. */
export const WithRestoredDraft: Story = {
    args: {
        ...WithDraftAction.args,
        draftSavedAt: '2026-08-12T08:30:00.000Z',
    },
};

/** A newer version was published after the draft was saved — publishing would overwrite it. */
export const WithStaleDraft: Story = {
    args: {
        ...WithRestoredDraft.args,
        draftStale: true,
    },
};
