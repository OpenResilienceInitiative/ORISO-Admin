import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from 'antd';
import FormPluginEditor from './FormPluginEditor';

type FormInitialValues = Record<string, unknown>;
type FormPluginEditorParameters = {
    formInitialValues?: FormInitialValues;
};
type FormPluginEditorStory = StoryObj<typeof meta> & {
    parameters?: StoryObj<typeof meta>['parameters'] & FormPluginEditorParameters;
};

const defaultFormInitialValues: FormInitialValues = {
    legalText:
        '<p>Willkommen bei <strong>ORISO</strong>.</p><p>Bitte beachten Sie unsere <em>Datenschutzhinweise</em>.</p>',
};

const getFormInitialValues = (parameters: FormPluginEditorParameters): FormInitialValues =>
    parameters.formInitialValues ?? defaultFormInitialValues;

// Renders the TipTap rich-text editor in isolation (toolbar + HTML content +
// placeholder insertion). Doubles as the React 19 smoke test for the editor.
const meta = {
    title: 'Organisms/FormPluginEditor',
    component: FormPluginEditor,
    parameters: { layout: 'padded' },
    decorators: [
        (Story, context) => (
            <Form
                style={{ maxWidth: 720 }}
                initialValues={getFormInitialValues(context.parameters)}
            >
                <Story />
            </Form>
        ),
    ],
} satisfies Meta<typeof FormPluginEditor>;

export default meta;
type Story = FormPluginEditorStory;

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
    parameters: { formInitialValues: {} },
};
