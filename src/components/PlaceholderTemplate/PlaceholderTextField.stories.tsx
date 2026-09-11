import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { PlaceholderTextField } from './PlaceholderTextField';
import { INVITE_EMAIL_TOKENS, LEGAL_CONSENT_TOKENS } from './placeholderTokens';

const meta = {
    title: 'Molecules/PlaceholderTemplate/PlaceholderTextField',
    component: PlaceholderTextField,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'Labelled text field with its own token picker: picking a token inserts `{{key}}` at the caret. Replaces the hardcoded `<code>` placeholder hint of the old template forms.',
            },
        },
    },
    decorators: [
        (Story) => (
            <div style={{ maxWidth: 560 }}>
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof PlaceholderTextField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Controlled wrapper — the field never owns its value. */
const ControlledField = (args: Parameters<NonNullable<Story['render']>>[0]) => {
    const [value, setValue] = useState(args.value);
    return <PlaceholderTextField {...args} value={value} onChange={setValue} />;
};

const render: Story['render'] = (args) => <ControlledField {...args} />;

export const SubjectLine: Story = {
    render,
    args: {
        label: 'Betreff',
        tokens: INVITE_EMAIL_TOKENS,
        value: 'Einladung für {{firstName}} {{lastName}}',
        onChange: () => {},
    },
};

export const MultilineBody: Story = {
    render,
    args: {
        label: 'Inhalt',
        multiline: true,
        rows: 8,
        tokens: INVITE_EMAIL_TOKENS,
        value: 'Hallo {{firstName}},\n\nüber diesen Link richten Sie Ihren Zugang ein:\n{{inviteLink}}',
        onChange: () => {},
    },
};

export const ConsentTokens: Story = {
    render,
    args: {
        label: 'Einwilligungstext',
        multiline: true,
        tokens: LEGAL_CONSENT_TOKENS,
        value: 'Ich habe die {{legal_links}} der {{Beratungsstelle}} zur Kenntnis genommen.',
        onChange: () => {},
    },
};
