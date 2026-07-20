import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ConfigProvider } from 'antd';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { userEvent, within } from 'storybook/test';
import { buildAdminAntdTheme } from '../../theme/antdM3Theme';
import { ReactComponent as ClockIcon } from '../../resources/img/svg/oriso/schedule_24px.svg';
import { FloatingLabelSelect } from './index';

const SALUTATIONS = [
    { label: 'Miss', value: 'miss' },
    { label: 'Mister', value: 'mister' },
    { label: 'Not Specified', value: 'not_specified' },
    { label: 'Non Binary', value: 'non_binary' },
];

const DURATIONS = [
    { label: '1 hour', value: '1' },
    { label: '3 hours', value: '3' },
    { label: '24 hours', value: '24' },
];

const meta: Meta<typeof FloatingLabelSelect> = {
    title: 'Atoms/FloatingLabelSelect',
    component: FloatingLabelSelect,
    parameters: {
        layout: 'fullscreen',
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/QfsgojtHQzBjbzU3Im9Cet/Admin.ORISO?node-id=1-34809',
        },
    },
};

export default meta;

/** The canvas itself is the card surface (#eae7e8) — no framing box — so the
 *  floating-label chip blends exactly as it does inside a card. */
const OnCard = ({ children }: { children: React.ReactNode }) => (
    <ConfigProvider theme={buildAdminAntdTheme()}>
        <div
            style={{
                minHeight: '100vh',
                padding: 24,
                background: 'var(--m3-surface-container-high, #eae7e8)',
            }}
        >
            <div style={{ maxWidth: 340 }}>{children}</div>
        </div>
    </ConfigProvider>
);

const Demo = ({ initial }: { initial?: string }) => {
    const [value, setValue] = useState<string | undefined>(initial);
    return (
        <OnCard>
            <FloatingLabelSelect
                label="Salutation"
                options={SALUTATIONS}
                value={value}
                onChange={setValue}
                showSearch
            />
        </OnCard>
    );
};

/** Resting: transparent outline, label in placeholder position — identical to the text field. */
export const Resting: StoryObj = { render: () => <Demo /> };

/** Filled: the label has floated up onto a card-coloured chip in the outline gap. */
export const Filled: StoryObj = { render: () => <Demo initial="not_specified" /> };

/** Leading icon (Figma 900-7044 session duration): a muted clock before the value. */
const LeadingIconDemo = () => {
    const [value, setValue] = useState<string | undefined>('3');
    return (
        <OnCard>
            <FloatingLabelSelect
                label="Maximum Session Duration"
                leadingIcon={<ClockIcon />}
                options={DURATIONS}
                value={value}
                onChange={setValue}
            />
        </OnCard>
    );
};
export const WithLeadingIcon: StoryObj = { render: () => <LeadingIconDemo /> };

/** Open menu with the selected option as a tonal pill + leading checkmark (Figma 1-34809). */
export const Open: StoryObj = {
    render: () => <Demo initial="not_specified" />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('combobox'));
    },
};

/** Error state: error-coloured outline + label, matching the text field's error treatment. */
export const Error: StoryObj = {
    render: () => (
        <OnCard>
            <FloatingLabelSelect
                label="Salutation"
                options={SALUTATIONS}
                value="not_specified"
                error
                supportingText="This field is required"
            />
        </OnCard>
    ),
};
