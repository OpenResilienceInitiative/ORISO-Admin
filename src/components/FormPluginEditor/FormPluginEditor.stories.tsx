import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from 'antd';
import FormPluginEditor from './FormPluginEditor';

// Renders the TipTap rich-text editor in isolation (toolbar + HTML content +
// placeholder insertion). Doubles as the React 19 smoke test for the editor.
const meta = {
    title: 'Organisms/FormPluginEditor',
    component: FormPluginEditor,
    parameters: { layout: 'padded' },
    decorators: [
        (Story) => (
            <Form
                style={{ maxWidth: 720 }}
                initialValues={{
                    legalText:
                        '<p>Willkommen bei <strong>ORISO</strong>.</p><p>Bitte beachten Sie unsere <em>Datenschutzhinweise</em>.</p>',
                }}
            >
                <Story />
            </Form>
        ),
    ],
} satisfies Meta<typeof FormPluginEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        name: 'legalText',
        placeholder: 'Rechtstext eingeben …',
        itemProps: { label: 'Rechtstext' },
    },
};

export const WithPlaceholders: Story = {
    args: {
        name: 'legalText',
        placeholder: 'E-Mail-Vorlage eingeben …',
        placeholders: { tenantName: 'Träger-Name', date: 'Datum' },
        itemProps: { label: 'E-Mail-Vorlage' },
    },
};

export const Disabled: Story = {
    args: {
        name: 'legalText',
        placeholder: 'Rechtstext eingeben …',
        disabled: true,
        itemProps: { label: 'Rechtstext (schreibgeschützt)' },
    },
};

// Fresh empty Form (no initialValues) so the placeholder is visible.
export const Empty: Story = {
    args: {
        name: 'legalText',
        placeholder: 'Rechtstext eingeben …',
        itemProps: { label: 'Rechtstext' },
    },
    decorators: [
        (Story) => (
            <Form style={{ maxWidth: 720 }}>
                <Story />
            </Form>
        ),
    ],
};
