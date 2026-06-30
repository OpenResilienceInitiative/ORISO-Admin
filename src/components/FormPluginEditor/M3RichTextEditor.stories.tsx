import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { M3RichTextEditor } from './M3RichTextEditor';

// MUI Material 3 "Tip Tap Editor Module" (Figma Admin.ORISO 1:34903).
const meta = {
    title: 'Organisms/M3 Rich Text Editor',
    component: M3RichTextEditor,
    parameters: { layout: 'centered' },
} satisfies Meta<typeof M3RichTextEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

const ControlledEditor = (args: Parameters<typeof M3RichTextEditor>[0]) => {
    const [value, setValue] = useState(args.value ?? '');
    const [language, setLanguage] = useState(args.language ?? 'de');
    return <M3RichTextEditor {...args} value={value} onChange={setValue} language={language} onLanguageChange={setLanguage} />;
};

export const Imprint: Story = {
    render: (args) => <ControlledEditor {...args} />,
    args: {
        title: 'Impressum',
        placeholder: 'Fügen Sie hier Ihr Impressum ein.',
        value: '<p>Willkommen bei <strong>ORISO</strong>.</p><p>Bitte beachten Sie unsere <em>Hinweise</em>.</p>',
        languages: [
            { value: 'de', label: 'Deutsch' },
            { value: 'en', label: 'Englisch' },
            { value: 'fr', label: 'Französisch' },
        ],
        language: 'de',
        versionLabel: 'Latest Version',
    },
};

export const GDPR: Story = {
    render: (args) => <ControlledEditor {...args} />,
    args: {
        title: 'Datenschutz',
        placeholder: 'Fügen Sie hier die Datenschutzerklärung ein.',
        value: '',
        languages: [{ value: 'de', label: 'Deutsch' }],
        language: 'de',
    },
};
