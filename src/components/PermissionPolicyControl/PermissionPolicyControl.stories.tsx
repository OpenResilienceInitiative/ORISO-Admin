import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
// eslint-disable-next-line import/no-unresolved -- exports-map subpath resolves for TypeScript and Vite
import { expect, within } from 'storybook/test';
import { PermissionPolicyControl } from './PermissionPolicyControl';
import type { PolicyValue } from '../../types/permissionPolicy';

const Preview = ({ initial, level }: { initial: PolicyValue<boolean>; level: 'platform' | 'tenant' | 'agency' }) => {
    const [policy, setPolicy] = useState(initial);
    const [open, setOpen] = useState(false);
    return (
        <div
            style={{
                width: 360,
                minHeight: 180,
                padding: 24,
                background: 'var(--m3-surface-container-high, #eae7e8)',
                borderRadius: 28,
            }}
        >
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
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const title = canvas.getByText('Supervision');
        const status = canvas.getByText(/Suggestion/i);
        await expect(title.parentElement).toContainElement(status);
        await expect(canvas.getByTestId('CheckIcon')).toBeInTheDocument();
    },
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
