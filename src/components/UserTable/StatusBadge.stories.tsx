import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect } from 'storybook/test';
import type { DisplayStatus } from '../../types/userDisplayStatus';
import { StatusBadge } from './StatusBadge';

/**
 * Account status as a word in a tonal chip with an icon. Active = primary
 * container, waiting states = tertiary container, ended states = secondary
 * container. „Eingeladen" links into the invite section.
 */
const meta = {
    title: 'Molecules/UserTable/StatusBadge',
    component: StatusBadge,
    parameters: { layout: 'padded' },
    args: { status: 'ACTIVE' },
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

const ALL: DisplayStatus[] = [
    'ACTIVE',
    'ABSENT',
    'DISABLED',
    'INVITED',
    'INACTIVE',
    'CREATED',
    'IN_PROGRESS',
    'ERROR',
    'IN_DELETION',
];

/** Every state `resolveDisplayStatus` can produce. */
export const AllStates: Story = {
    render: () => (
        <div
            style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 12,
                padding: 16,
                borderRadius: 16,
                background: 'var(--admin-table-surface, #f6f3f3)',
            }}
        >
            {ALL.map((status) => (
                <StatusBadge key={status} status={status} />
            ))}
        </div>
    ),
    play: async ({ canvas, canvasElement }) => {
        await expect(canvas.getByText(/^(Aktiv|Active)$/)).toBeVisible();
        await expect(canvas.getByText(/^(Abwesend|Absent)$/)).toBeVisible();
        // DISABLED (not unlocked) and INACTIVE share one word.
        await expect(canvas.getAllByText(/^(Inaktiv|Inactive)$/)).toHaveLength(2);
        await expect(canvas.getByText(/^(Wird gelöscht|Being deleted)$/)).toBeVisible();

        const TONE: Partial<Record<DisplayStatus, string>> = { ACTIVE: 'active', IN_DELETION: 'ended', ERROR: 'ended' };
        const seen = ALL.map((status) => {
            const badge = canvasElement.querySelector(`[data-status="${status}"]`);
            const icon = badge?.querySelector('svg');
            return {
                status,
                word: !!badge?.textContent?.trim(),
                icon: icon?.getAttribute('aria-hidden') === 'true',
                // The old dot was an aria-hidden span; the icon replaces it.
                dot: !!badge?.querySelector('span[aria-hidden]'),
                tone: badge?.getAttribute('data-tone'),
            };
        });
        await expect(seen).toEqual(
            ALL.map((status) => ({ status, word: true, icon: true, dot: false, tone: TONE[status] ?? 'pending' })),
        );
    },
};

export const Invited: Story = {
    args: { status: 'INVITED', inviteTo: '/admin/links/counsellor' },
    play: async ({ canvas }) => {
        const link = canvas.getByRole('link', { name: /^(Eingeladen|Invited)/ });
        await expect(link).toHaveAttribute('href', '/admin/links/counsellor');
    },
};

/** Every other state is plain text, never a link. */
export const Absent: Story = {
    args: { status: 'ABSENT' },
    play: async ({ canvas }) => {
        await expect(canvas.queryByRole('link')).toBeNull();
        await expect(canvas.getByText(/^(Abwesend|Absent)$/)).toBeVisible();
    },
};
