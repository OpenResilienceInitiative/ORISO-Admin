import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { PermissionPolicyControl } from './PermissionPolicyControl';
import type { PolicyValue } from '../../types/permissionPolicy';

const Preview = ({ initial, level }: { initial: PolicyValue<boolean>; level: 'platform' | 'tenant' | 'agency' }) => {
    const [policy, setPolicy] = useState(initial);
    const [open, setOpen] = useState(false);
    return (
        <div style={{ minHeight: 420, padding: 180 }}>
            <PermissionPolicyControl
                featureKey="featureSupervisionEnabled"
                label="Supervision"
                level={level}
                policy={policy}
                open={open}
                onOpenChange={setOpen}
                onChange={setPolicy}
            />
        </div>
    );
};

const meta = {
    title: 'Molecules/PermissionPolicyControl',
    component: PermissionPolicyControl,
    args: {
        featureKey: 'featureSupervisionEnabled',
        label: 'Supervision',
        level: 'tenant',
        policy: { value: true, mode: 'SUGGESTED' },
        open: false,
        onOpenChange: () => undefined,
        onChange: () => undefined,
    },
} satisfies Meta<typeof PermissionPolicyControl>;
export default meta;
type Story = StoryObj<typeof meta>;

export const SuggestedActive: Story = {
    render: () => <Preview initial={{ value: true, mode: 'SUGGESTED' }} level="tenant" />,
};
export const EnforcedInactive: Story = {
    render: () => <Preview initial={{ value: false, mode: 'ENFORCED' }} level="platform" />,
};
export const InheritedReadOnly: Story = {
    render: () => <Preview initial={{ value: true, mode: 'ENFORCED', inherited: true }} level="tenant" />,
};
export const AgencyChoices: Story = {
    render: () => <Preview initial={{ value: true, mode: 'SUGGESTED' }} level="agency" />,
};
