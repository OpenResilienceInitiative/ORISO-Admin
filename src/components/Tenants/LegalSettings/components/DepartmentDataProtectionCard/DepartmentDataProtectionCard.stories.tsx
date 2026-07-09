import type { Meta, StoryObj } from '@storybook/react-vite';
import { DepartmentDataProtectionCard } from './index';

const meta = {
    title: 'Organisms/Legal/DepartmentDataProtectionCard',
    component: DepartmentDataProtectionCard,
    parameters: { layout: 'padded' },
    args: { onSave: () => undefined },
} satisfies Meta<typeof DepartmentDataProtectionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Published: Story = {
    args: {
        departmentName: 'Schwangerschaftsberatung',
        publicationStatus: 'PUBLISHED',
        initialContentByLanguage: {
            de:
                '<h1>Datenschutzerklärung</h1>' +
                '<p>Fachbereich Schwangerschaftsberatung. Verantwortlicher, Zwecke, Rechtsgrundlagen, ' +
                'Speicherdauer und Betroffenenrechte.</p>',
        },
        languages: ['de'],
    },
};

export const Multilingual: Story = {
    args: {
        departmentName: 'Suchtberatung',
        publicationStatus: 'PUBLISHED',
        initialContentByLanguage: {
            de: '<h1>Datenschutzerklärung</h1><p>Deutsche Fassung des Fachbereichs Suchtberatung.</p>',
            en: '<h1>Data privacy policy</h1><p>English version of the addiction counselling department.</p>',
        },
        languages: ['de', 'en'],
        defaultLanguage: 'de',
    },
};

export const Draft: Story = {
    args: {
        departmentName: 'Suchtberatung',
        publicationStatus: 'DRAFT',
        initialContentByLanguage: {
            de: '<p>Entwurf der Datenschutzerklärung – noch nicht veröffentlicht …</p>',
        },
        languages: ['de'],
    },
};

export const Empty: Story = {
    args: {
        departmentName: 'Neuer Fachbereich',
        initialContentByLanguage: {},
        languages: ['de'],
    },
};

// Narrow viewport: the card must stay usable at its 375px minimum width —
// same convention as the FormPluginEditor narrow story.
export const Narrow: Story = {
    args: Multilingual.args,
    decorators: [
        (Story) => (
            <div style={{ width: 375 }}>
                <Story />
            </div>
        ),
    ],
};
