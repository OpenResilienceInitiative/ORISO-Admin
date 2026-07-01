import type { Meta, StoryObj } from '@storybook/react-vite';
import { DataProcessingAgreementCard } from './index';

const meta = {
    title: 'Organisms/Legal/DataProcessingAgreementCard',
    component: DataProcessingAgreementCard,
    parameters: { layout: 'padded' },
    args: { onPublish: () => undefined },
} satisfies Meta<typeof DataProcessingAgreementCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const versions = [
    {
        id: '2026-07-13T10:22',
        label: '13. Jul 2026 – 10:22 (aktuell)',
        content:
            '<h1>Auftragsverarbeitungsvertrag</h1>' +
            '<p>Aktuelle Fassung. Weisungsbindung, Vertraulichkeit, TOMs, Löschung/Rückgabe.</p>',
    },
    {
        id: '2026-05-02T09:00',
        label: '2. Mai 2026 – 09:00',
        content: '<h1>Auftragsverarbeitungsvertrag</h1><p>Ältere Fassung vom Mai 2026.</p>',
    },
];

export const WithHistory: Story = {
    args: {
        initialContent:
            '<h1>Auftragsverarbeitungsvertrag</h1><p>Aktueller Entwurf, bereit zum Veröffentlichen …</p>',
        versions,
    },
};

export const FirstPublish: Story = {
    args: {
        initialContent: '',
        versions: [],
    },
};
