import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
// eslint-disable-next-line import/no-unresolved -- exports-map subpath resolves for TypeScript and Vite
import { expect, within } from 'storybook/test';
import { PermissionPolicyControl } from './PermissionPolicyControl';
import type { PolicyValue } from '../../types/permissionPolicy';

const Preview = ({
    initial,
    level,
    initialOpen = false,
}: {
    initial: PolicyValue<boolean>;
    level: 'platform' | 'tenant' | 'agency';
    initialOpen?: boolean;
}) => {
    const [policy, setPolicy] = useState(initial);
    const [open, setOpen] = useState(initialOpen);
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

const expectMenuColours = async (
    canvasElement: HTMLElement,
    itemBackgroundColor: string,
    foregroundColor: string,
    fabBackgroundColor = itemBackgroundColor,
) => {
    const canvas = within(canvasElement);
    const adjustableAction = canvas.getByRole('button', {
        name: /^(?:Activation \(adjustable\)|Aktivierung \(anpassbar\))$/i,
    });
    const closeAction = canvas.getByRole('button', {
        name: /Close policy choices|Policy-Auswahl schließen/i,
    });

    const colourExpectations = (
        [
            [adjustableAction, itemBackgroundColor],
            [closeAction, fabBackgroundColor],
        ] as const
    ).flatMap(([action, backgroundColor]) => {
        const computed = window.getComputedStyle(action);
        return [
            expect(computed.backgroundColor).toBe(backgroundColor),
            expect(computed.color).toBe(foregroundColor),
            expect(computed.borderTopStyle).toBe('none'),
            expect(computed.outlineStyle).toBe('none'),
        ];
    });

    await Promise.all(colourExpectations);

    await expect(window.getComputedStyle(adjustableAction).boxShadow).toBe('none');
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
        const status = canvas.getByText(/Recommendation|Empfehlung/i);
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

/** Figma 1789:11645 — primary-container menu, without a selected-item outline. */
export const ActiveMenuOpen: Story = {
    render: () => <Preview initial={{ value: true, mode: 'SUGGESTED' }} level="tenant" initialOpen />,
    play: async ({ canvasElement }) => {
        await expectMenuColours(canvasElement, 'rgb(204, 30, 28)', 'rgb(255, 226, 222)', 'rgb(165, 0, 10)');
    },
};

/** Figma 1793:15324 — secondary menu for a deactivated feature. */
export const DeactivatedMenuOpen: Story = {
    render: () => <Preview initial={{ value: false, mode: 'SUGGESTED' }} level="tenant" initialOpen />,
    play: async ({ canvasElement }) => {
        await expectMenuColours(canvasElement, 'rgb(76, 85, 95)', 'rgb(231, 239, 252)');
    },
};
