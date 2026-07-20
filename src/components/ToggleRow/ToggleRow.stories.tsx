import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ToggleRow } from './index';

const meta = {
    title: 'Molecules/ToggleRow',
    component: ToggleRow,
    parameters: {
        layout: 'padded',
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/QfsgojtHQzBjbzU3Im9Cet/Admin.ORISO?node-id=900-7044',
        },
    },
    args: { label: 'Enabled' },
} satisfies Meta<typeof ToggleRow>;

export default meta;
type Story = StoryObj<typeof meta>;

const SwitchOnlyExample = ({ label }: { label: string }) => {
    const [on, setOn] = useState(true);
    return (
        <div style={{ width: 380 }}>
            <ToggleRow label={label} checked={on} onCheckedChange={setOn} />
        </div>
    );
};

export const SwitchOnly: Story = {
    render: (args) => <SwitchOnlyExample label={String(args.label)} />,
};

const WithCheckboxExample = () => {
    const [on, setOn] = useState(true);
    const [box, setBox] = useState(false);
    return (
        <div style={{ width: 380 }}>
            <ToggleRow
                label="Activated"
                checkbox
                checked={on}
                onCheckedChange={setOn}
                checkboxChecked={box}
                onCheckboxChange={setBox}
            />
        </div>
    );
};

export const WithCheckbox: Story = {
    render: () => <WithCheckboxExample />,
};

const CaseTakeoverExample = () => {
    const [activated, setActivated] = useState(true);
    const [optOut, setOptOut] = useState(false);
    return (
        <div style={{ width: 400, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <ToggleRow label="Activated" checkbox checked={activated} onCheckedChange={setActivated} />
            <ToggleRow
                label="Opt-out message to the advice seeker"
                checkbox
                checked={optOut}
                onCheckedChange={setOptOut}
            />
            <ToggleRow label="Own picture visible internally only" checked onCheckedChange={() => undefined} />
        </div>
    );
};

/** Case-takeover header block: activated + opt-out. */
export const CaseTakeoverBlock: StoryObj = {
    render: () => <CaseTakeoverExample />,
};
