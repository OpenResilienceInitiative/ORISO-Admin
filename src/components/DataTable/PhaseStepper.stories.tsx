import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- valid `storybook` package-exports subpath; the eslint resolver predates exports maps
import { expect, within } from 'storybook/test';
import { PhaseStepper } from './PhaseStepper';

/**
 * Compact per-row progress stepper ("bead track") for phase-based processes,
 * built for the invite/onboarding table. Beads: done (secondary + check),
 * current (primary ring — the row's single accent), pending (hollow), warning
 * (amber), error (magenta error role). Screen readers hear every phase with
 * its state; sighted users additionally get the label of the phase that
 * currently matters.
 */
const meta = {
    title: 'Molecules/PhaseStepper',
    component: PhaseStepper,
    parameters: { layout: 'padded' },
} satisfies Meta<typeof PhaseStepper>;

export default meta;
type Story = StoryObj<typeof meta>;

const TENANT_TRACK = (states: ('done' | 'current' | 'pending' | 'warning' | 'error')[]) =>
    (
        [
            { key: 'invited', label: 'Eingeladen' },
            { key: 'registered', label: 'Registriert' },
            { key: 'dpaSigned', label: 'Vertrag unterschrieben' },
            { key: 'twoFactorActive', label: '2FA aktiv' },
            { key: 'completed', label: 'Abgeschlossen' },
        ] as const
    ).map((phase, index) => ({ ...phase, state: states[index] }));

/** Fresh Träger invite: sent, waiting for the registration. */
export const InProgress: Story = {
    args: {
        phases: TENANT_TRACK(['done', 'current', 'pending', 'pending', 'pending']),
        ariaLabel: 'Onboarding-Fortschritt',
    },
};

/** Every gate passed — the whole track reads done. */
export const AllDone: Story = {
    args: {
        phases: TENANT_TRACK(['done', 'done', 'done', 'done', 'done']),
        ariaLabel: 'Onboarding-Fortschritt',
    },
};

/** Bounced invite mail: the first bead warns (a resend repairs it). */
export const DeliveryWarning: Story = {
    args: {
        phases: TENANT_TRACK(['warning', 'pending', 'pending', 'pending', 'pending']),
        ariaLabel: 'Onboarding-Fortschritt',
    },
};

/** Expired/revoked invite: the blocked phase carries the magenta error role. */
export const ErrorState: Story = {
    args: {
        phases: TENANT_TRACK(['done', 'error', 'pending', 'pending', 'pending']),
        ariaLabel: 'Onboarding-Fortschritt',
    },
};

/** The short Berater track (three phases, all the API can prove today). */
export const CounsellorTrack: Story = {
    args: {
        phases: [
            { key: 'invited', label: 'Eingeladen', state: 'done' },
            { key: 'accountCreated', label: 'Konto angelegt', state: 'current' },
            { key: 'completed', label: 'Abgeschlossen', state: 'pending' },
        ],
        ariaLabel: 'Onboarding-Fortschritt',
    },
};

/** Ultra-compact: beads only, the label stays screen-reader-only. */
export const BeadsOnly: Story = {
    args: {
        phases: TENANT_TRACK(['done', 'done', 'current', 'pending', 'pending']),
        showActiveLabel: false,
        ariaLabel: 'Onboarding-Fortschritt',
    },
};

const DATED_TRAEGER_TRACK = [
    {
        key: 'unit',
        label: 'Träger angelegt',
        state: 'done',
        at: { short: '20.09., 08:00', full: '20.09.2026, 08:00 Uhr' },
    },
    {
        key: 'invited',
        label: 'Eingeladen',
        state: 'done',
        at: { short: '20.09., 08:05', full: '20.09.2026, 08:05 Uhr' },
    },
    {
        key: 'registered',
        label: 'Registriert',
        state: 'done',
        at: { short: '21.09., 10:12', full: '21.09.2026, 10:12 Uhr' },
    },
    {
        key: 'dpaSigned',
        label: 'Vertrag unterschrieben',
        state: 'done',
        at: { short: '22.09., 14:30', full: '22.09.2026, 14:30 Uhr' },
    },
    { key: 'twoFactorActive', label: '2FA aktiv', state: 'current' },
    { key: 'completed', label: 'Fertig', state: 'pending' },
] as const;

/** Six dated Träger steps in a phone-wide card: the track scrolls inside the card instead of spilling out. */
export const DatedTrackInPhoneCard: Story = {
    args: { phases: DATED_TRAEGER_TRACK.map((phase) => ({ ...phase })), ariaLabel: 'Onboarding-Fortschritt' },
    decorators: [
        (Story) => (
            <div data-testid="card" style={{ width: 320, overflow: 'hidden' }}>
                <Story />
            </div>
        ),
    ],
    play: async ({ canvasElement }) => {
        const track = canvasElement.querySelector('ol') as HTMLElement;
        const card = within(canvasElement).getByTestId('card');
        await expect(track.getBoundingClientRect().right).toBeLessThanOrEqual(card.getBoundingClientRect().right);
        // Whatever does not fit must stay reachable: the track itself scrolls.
        await expect(track.scrollWidth <= track.clientWidth || getComputedStyle(track).overflowX === 'auto').toBe(true);
    },
};
