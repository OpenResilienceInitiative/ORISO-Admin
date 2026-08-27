import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CaseHandoverConsentPolicy } from '../../types/permissionPolicy';
import { CaseHandoverConsentPolicyControl } from './CaseHandoverConsentPolicyControl';

const Frame = ({
    initialPolicy,
    initialOpen = false,
}: {
    initialPolicy: CaseHandoverConsentPolicy;
    initialOpen?: boolean;
}) => {
    const [policy, setPolicy] = useState(initialPolicy);
    const [open, setOpen] = useState(initialOpen);

    return (
        <div
            style={{
                width: 425,
                minHeight: 420,
                boxSizing: 'border-box',
                padding: 24,
                background: 'var(--m3-surface-container-high, #eae7e8)',
                borderRadius: 28,
            }}
        >
            <CaseHandoverConsentPolicyControl
                label="Zustimmung Ratsuchende Person"
                policy={policy}
                open={open}
                onOpenChange={setOpen}
                onChange={setPolicy}
            />
        </div>
    );
};

const meta = {
    title: 'Molecules/CaseHandoverConsentPolicyControl',
    component: CaseHandoverConsentPolicyControl,
    parameters: {
        layout: 'centered',
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/QfsgojtHQzBjbzU3Im9Cet/Admin.ORISO?node-id=1812-12416&m=dev',
        },
    },
} satisfies Meta<typeof CaseHandoverConsentPolicyControl>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MenuOpen: Story = {
    args: {} as never,
    render: () => <Frame initialPolicy={{ value: 'OPT_IN', mode: 'SUGGESTED' }} initialOpen />,
};

export const OptInEnforced: Story = {
    args: {} as never,
    render: () => <Frame initialPolicy={{ value: 'OPT_IN', mode: 'ENFORCED' }} />,
};

export const OptOutEnforced: Story = {
    args: {} as never,
    render: () => <Frame initialPolicy={{ value: 'OPT_OUT', mode: 'ENFORCED' }} />,
};

export const NoConsentRecommendation: Story = {
    args: {} as never,
    render: () => <Frame initialPolicy={{ value: 'NONE', mode: 'SUGGESTED' }} />,
};

export const OptInRecommendation: Story = {
    args: {} as never,
    render: () => <Frame initialPolicy={{ value: 'OPT_IN', mode: 'SUGGESTED' }} />,
};

export const OptOutRecommendation: Story = {
    args: {} as never,
    render: () => <Frame initialPolicy={{ value: 'OPT_OUT', mode: 'SUGGESTED' }} />,
};
