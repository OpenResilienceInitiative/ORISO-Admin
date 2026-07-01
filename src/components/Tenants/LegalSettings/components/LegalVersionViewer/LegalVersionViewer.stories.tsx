import type { Meta, StoryObj } from '@storybook/react-vite';
import { LegalVersionViewer } from './index';

const meta = {
    title: 'Molecules/Legal/LegalVersionViewer',
    component: LegalVersionViewer,
    parameters: { layout: 'padded' },
} satisfies Meta<typeof LegalVersionViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

const versions = [
    {
        id: '2026-07-13T10:22',
        label: '13. Jul 2026 – 10:22 (aktuell)',
        content:
            '<h1>Auftragsverarbeitungsvertrag</h1>' +
            '<p>Diese Fassung beschreibt, wie personenbezogene Daten im Auftrag verarbeitet werden. ' +
            'Erhebung ausschließlich für legitime Zwecke, Verarbeitung gemäß DSGVO.</p>' +
            '<p><strong>Weisungsbindung</strong>, Vertraulichkeit, technische und organisatorische ' +
            'Maßnahmen (TOMs) sowie Löschung/Rückgabe sind geregelt.</p>',
    },
    {
        id: '2026-05-02T09:00',
        label: '2. Mai 2026 – 09:00',
        content:
            '<h1>Auftragsverarbeitungsvertrag</h1>' +
            '<p>Ältere Fassung vom Mai 2026. Enthält noch die frühere Formulierung zu den ' +
            'Sub-Auftragsverarbeitern.</p>',
    },
    {
        id: '2026-01-15T14:30',
        label: '15. Jan 2026 – 14:30',
        content:
            '<h1>Auftragsverarbeitungsvertrag</h1>' +
            '<p>Erste Fassung vom Januar 2026.</p>',
    },
];

export const Default: Story = {
    args: { versions },
};

export const SingleVersion: Story = {
    args: { versions: [versions[0]] },
};
