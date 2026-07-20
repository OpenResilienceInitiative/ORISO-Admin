import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { SegmentedTabs } from './index';

const meta = {
    title: 'Molecules/SegmentedTabs',
    component: SegmentedTabs,
    parameters: {
        layout: 'padded',
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/QfsgojtHQzBjbzU3Im9Cet/Admin.ORISO?node-id=900-7044',
        },
    },
} satisfies Meta<typeof SegmentedTabs>;

export default meta;

const TABS = [
    { key: 'holiday', label: 'Holiday' },
    { key: 'illness', label: 'Illness' },
    { key: 'advice', label: 'Advice needed' },
    { key: 'legal', label: 'Legal violation' },
];

const Demo = () => {
    const [active, setActive] = useState('advice');
    return (
        <div style={{ width: 360 }}>
            <SegmentedTabs tabs={TABS} activeKey={active} onChange={setActive} ariaLabel="Consent scope" />
        </div>
    );
};

/** Case-takeover topic tabs — "Advice needed" active (primary text + underline). */
export const Default: StoryObj = { render: () => <Demo /> };
