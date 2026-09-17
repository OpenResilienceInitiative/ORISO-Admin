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

// Default light palette: --m3-primary #a5000a, --m3-primary-container #ffe2de,
// --m3-secondary #4c555f, --m3-on-secondary-container #e7effc. A Träger theme
// re-seeds these; the fixed red #cc1e1c must never appear again (#992).
const PRIMARY = 'rgb(165, 0, 10)';
const ON_PRIMARY = 'rgb(255, 226, 222)';
const NEUTRAL = 'rgb(76, 85, 95)';
const ON_NEUTRAL = 'rgb(231, 239, 252)';
const HARD_CODED_RED = 'rgb(204, 30, 28)';

const expectTone = (element: HTMLElement, backgroundColor: string, color: string) => {
    const computed = window.getComputedStyle(element);
    expect(computed.backgroundColor).not.toBe(HARD_CODED_RED);
    expect(computed.backgroundColor).toBe(backgroundColor);
    expect(computed.color).toBe(color);
    expect(computed.borderTopStyle).toBe('none');
    expect(computed.outlineStyle).toBe('none');
};

/**
 * Tone follows the action, never the current value: every "activate" pill is
 * primary, every "deactivate" pill and "more information" are neutral. The
 * closed FAB alone still shows the current value.
 */
const expectActionTones = async (canvasElement: HTMLElement, currentValue: boolean) => {
    const canvas = within(canvasElement);
    // The menu focuses its first pill on open; the focus state layer is a
    // color-mix on top of the tone, so drop focus before reading the tone.
    (document.activeElement as HTMLElement | null)?.blur();
    const activate = canvas.getAllByRole('button', { name: /^(?:Activation|Aktivierung)\b/i });
    const deactivate = canvas.getAllByRole('button', { name: /^(?:Deactivation|Deaktivierung)\b/i });
    const info = canvas.getByRole('button', { name: /More information|Weitere Informationen/i });
    const closeAction = canvas.getByRole('button', { name: /Close policy choices|Policy-Auswahl schließen/i });

    await expect(activate.length).toBeGreaterThan(0);
    await expect(deactivate.length).toBe(activate.length);
    activate.forEach((button) => expectTone(button, PRIMARY, ON_PRIMARY));
    deactivate.forEach((button) => expectTone(button, NEUTRAL, ON_NEUTRAL));
    expectTone(info, NEUTRAL, ON_NEUTRAL);
    expectTone(closeAction, currentValue ? PRIMARY : NEUTRAL, currentValue ? ON_PRIMARY : ON_NEUTRAL);
    await expect(window.getComputedStyle(activate[0]).boxShadow).toBe('none');
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

/**
 * Figma 1789:11645 — Träger view, feature ON. Before #992 the whole menu was
 * red; now only "activate" is primary, "deactivate" is neutral.
 */
export const TenantEnabledMenuOpen: Story = {
    render: () => <Preview initial={{ value: true, mode: 'SUGGESTED' }} level="tenant" initialOpen />,
    play: async ({ canvasElement }) => {
        await expectActionTones(canvasElement, true);
    },
};

/**
 * Figma 1793:15324 — Träger view, feature OFF. Before #992 the whole menu was
 * grey; "activate" is now primary even though the feature is off.
 */
export const TenantDisabledMenuOpen: Story = {
    render: () => <Preview initial={{ value: false, mode: 'SUGGESTED' }} level="tenant" initialOpen />,
    play: async ({ canvasElement }) => {
        await expectActionTones(canvasElement, false);
    },
};

/** Platform view, feature ON — identical tones to the Träger view. */
export const PlatformEnabledMenuOpen: Story = {
    render: () => <Preview initial={{ value: true, mode: 'ENFORCED' }} level="platform" initialOpen />,
    play: async ({ canvasElement }) => {
        await expectActionTones(canvasElement, true);
    },
};

/** Platform view, feature OFF (enforced) — "activate" stays primary. */
export const PlatformDisabledMenuOpen: Story = {
    render: () => <Preview initial={{ value: false, mode: 'ENFORCED' }} level="platform" initialOpen />,
    play: async ({ canvasElement }) => {
        await expectActionTones(canvasElement, false);
    },
};

/** Agency view offers only the two adjustable actions; tones are the same. */
export const AgencyEnabledMenuOpen: Story = {
    render: () => <Preview initial={{ value: true, mode: 'SUGGESTED' }} level="agency" initialOpen />,
    play: async ({ canvasElement }) => {
        await expectActionTones(canvasElement, true);
    },
};

/** Agency view, feature OFF. */
export const AgencyDisabledMenuOpen: Story = {
    render: () => <Preview initial={{ value: false, mode: 'SUGGESTED' }} level="agency" initialOpen />,
    play: async ({ canvasElement }) => {
        await expectActionTones(canvasElement, false);
    },
};
