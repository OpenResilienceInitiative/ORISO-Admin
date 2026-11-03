import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
// eslint-disable-next-line import/no-unresolved -- exports-map subpath resolves for TypeScript and Vite
import { expect, userEvent, within } from 'storybook/test';
import { PermissionPolicyControl } from './PermissionPolicyControl';
import type { PolicyValue } from '../../types/permissionPolicy';

const Preview = ({ initial, level }: { initial: PolicyValue<boolean>; level: 'platform' | 'tenant' | 'agency' }) => {
    const [policy, setPolicy] = useState(initial);
    return (
        <div
            style={{
                width: 360,
                minHeight: 120,
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
                onChange={setPolicy}
            />
        </div>
    );
};

// Default light palette: --m3-primary #a5000a, --m3-secondary #4c555f. A Träger theme
// re-seeds these; the fixed red #cc1e1c must never appear again (#992).
const PRIMARY = 'rgb(165, 0, 10)';
const NEUTRAL = 'rgb(76, 85, 95)';
const WHITE = 'rgb(255, 255, 255)';
const HARD_CODED_RED = 'rgb(204, 30, 28)';

const expectTone = (element: HTMLElement, backgroundColor: string, color: string) => {
    const computed = window.getComputedStyle(element);
    expect(computed.backgroundColor).not.toBe(HARD_CODED_RED);
    expect(computed.backgroundColor).toBe(backgroundColor);
    expect(computed.color).toBe(color);
    expect(computed.borderTopStyle).toBe('none');
    expect(computed.outlineStyle).toBe('none');
};

/** The round on/off button; its name is "<label>: <state>" plus " – <action>" while editable. */
const roundButton = (canvas: ReturnType<typeof within>) =>
    canvas.getByRole('button', { name: /^Supervision: (Active|Inactive|Aktiviert|Deaktiviert)/ });
/** The requirement lock; only platform and Träger have one. */
const lockButton = (canvas: ReturnType<typeof within>) =>
    canvas.queryByRole('button', {
        name: /(Make it a requirement|Make it adjustable|Als Vorgabe festlegen|Anpassbar machen)$/,
    });

/**
 * Tone follows the current value: an active round button is primary, an inactive one is neutral,
 * never the old fixed red (#992). The lock carries no filled background of its own.
 */
const expectValueTone = (canvasElement: HTMLElement, active: boolean) => {
    const round = roundButton(within(canvasElement));
    // Drop focus first: the focus state layer is a color-mix on top of the tone.
    (document.activeElement as HTMLElement | null)?.blur();
    expectTone(round, active ? PRIMARY : NEUTRAL, WHITE);
};

const meta = {
    title: 'Molecules/PermissionPolicyControl',
    component: PermissionPolicyControl,
    args: {
        featureKey: 'featureSupervisionEnabled',
        label: 'Supervision',
        level: 'tenant',
        policy: { value: true, mode: 'SUGGESTED' },
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
        const status = canvas.getByText(/Adjustable|Anpassbar/i);
        await expect(title.parentElement).toContainElement(status);
        await expect(canvas.getByTestId('CheckIcon')).toBeInTheDocument();
    },
};
export const EnforcedInactive: Story = {
    render: () => <Preview initial={{ value: false, mode: 'ENFORCED' }} level="platform" />,
};
export const InheritedReadOnly: Story = {
    render: () => <Preview initial={{ value: true, mode: 'ENFORCED', inherited: true }} level="tenant" />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        // A requirement from above: one disabled button that only states the value, no lock, no dialog.
        await expect(roundButton(canvas)).toBeDisabled();
        await expect(lockButton(canvas)).toBeNull();
        await expect(canvas.getAllByRole('button')).toHaveLength(1);
    },
};
export const AgencyChoices: Story = {
    render: () => <Preview initial={{ value: true, mode: 'SUGGESTED' }} level="agency" />,
};

/** Figma 1789:11645 — Träger view, feature ON. The round button switches it off and back on. */
export const TenantEnabled: Story = {
    render: () => <Preview initial={{ value: true, mode: 'SUGGESTED' }} level="tenant" />,
    play: async ({ canvasElement }) => {
        expectValueTone(canvasElement, true);
        const canvas = within(canvasElement);
        await expect(roundButton(canvas)).toHaveAttribute('aria-pressed', 'true');
        await userEvent.click(roundButton(canvas));
        await expect(roundButton(canvas)).toHaveAttribute('aria-pressed', 'false');
        (document.activeElement as HTMLElement | null)?.blur();
        expectValueTone(canvasElement, false);
    },
};

/** Figma 1793:15324 — Träger view, feature OFF. Switching it on makes the button primary. */
export const TenantDisabled: Story = {
    render: () => <Preview initial={{ value: false, mode: 'SUGGESTED' }} level="tenant" />,
    play: async ({ canvasElement }) => {
        expectValueTone(canvasElement, false);
        const canvas = within(canvasElement);
        await userEvent.click(roundButton(canvas));
        await expect(roundButton(canvas)).toHaveAttribute('aria-pressed', 'true');
        (document.activeElement as HTMLElement | null)?.blur();
        expectValueTone(canvasElement, true);
    },
};

/** Träger view: the lock turns an adjustable setting into a requirement and back, without touching the value. */
export const TenantLockToggle: Story = {
    render: () => <Preview initial={{ value: true, mode: 'SUGGESTED' }} level="tenant" />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(lockButton(canvas)).toHaveAttribute('aria-pressed', 'false');
        await userEvent.click(lockButton(canvas) as HTMLElement);
        await expect(lockButton(canvas)).toHaveAttribute('aria-pressed', 'true');
        await expect(canvas.getByText(/Requirement|Vorgabe/)).toBeInTheDocument();
        await expect(roundButton(canvas)).toHaveAttribute('aria-pressed', 'true');
        await userEvent.click(lockButton(canvas) as HTMLElement);
        await expect(lockButton(canvas)).toHaveAttribute('aria-pressed', 'false');
    },
};

/** Platform view, feature ON, requirement — same tones as the Träger view. */
export const PlatformEnabledRequirement: Story = {
    render: () => <Preview initial={{ value: true, mode: 'ENFORCED' }} level="platform" />,
    play: async ({ canvasElement }) => {
        expectValueTone(canvasElement, true);
        await expect(lockButton(within(canvasElement))).toHaveAttribute('aria-pressed', 'true');
    },
};

/** Platform view, feature OFF (requirement) — the round button stays neutral. */
export const PlatformDisabledRequirement: Story = {
    render: () => <Preview initial={{ value: false, mode: 'ENFORCED' }} level="platform" />,
    play: async ({ canvasElement }) => {
        expectValueTone(canvasElement, false);
        await expect(lockButton(within(canvasElement))).toHaveAttribute('aria-pressed', 'true');
    },
};

/** Agency view only switches: no lock exists, and the value tone is the same. */
export const AgencyEnabled: Story = {
    render: () => <Preview initial={{ value: true, mode: 'SUGGESTED' }} level="agency" />,
    play: async ({ canvasElement }) => {
        expectValueTone(canvasElement, true);
        await expect(lockButton(within(canvasElement))).toBeNull();
        await expect(within(canvasElement).getAllByRole('button')).toHaveLength(1);
    },
};

/** Agency view, feature OFF. */
export const AgencyDisabled: Story = {
    render: () => <Preview initial={{ value: false, mode: 'SUGGESTED' }} level="agency" />,
    play: async ({ canvasElement }) => {
        expectValueTone(canvasElement, false);
        await expect(lockButton(within(canvasElement))).toBeNull();
    },
};
