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

// Narrow viewport: the card follows the available canvas without widening it.
export const Narrow: Story = {
    args: Multilingual.args,
    decorators: [
        (Story) => (
            <div style={{ width: '100%', maxWidth: 375 }}>
                <Story />
            </div>
        ),
    ],
};

/**
 * A Beratungsstelle without a single Fachbereich (#914). The consent segment of
 * the function bar used to be empty here; it now carries the stand-in that opens
 * the operator disclaimer.
 */
export const ConsentUnavailableNoDepartments: Story = {
    args: {
        initialContentByLanguage: {
            de: '<h1>Datenschutzerklärung</h1><p>Beratungsstellenweite Fassung.</p>',
        },
        languages: ['de'],
        consentUnavailableReason: 'noDepartments',
    },
};

/**
 * Fachbereiche exist, the switcher is on "Alle Fachbereiche" — consent-free by
 * decision (#862). The stand-in explains that the sentence lives one level down.
 */
export const ConsentUnavailableAllDepartments: Story = {
    args: {
        initialContentByLanguage: {
            de: '<h1>Datenschutzerklärung</h1><p>Beratungsstellenweite Fassung, von allen Fachbereichen geerbt.</p>',
        },
        languages: ['de'],
        consentUnavailableReason: 'allDepartments',
    },
};
