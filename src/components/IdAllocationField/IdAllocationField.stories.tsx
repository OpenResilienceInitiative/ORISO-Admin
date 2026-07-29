import type { Meta, StoryObj } from '@storybook/react-vite';
import { IdAllocationField, useIdAllocation, type UseIdAllocationResult } from './index';
import { workedExampleIdAllocationClient } from './workedExampleFixture';

/**
 * Stubbed allocation client with the worked example from ORISO-Admin#570:
 * ids 1–20 are assigned and 30–35 are reserved by open invites. Auto adopts 21,
 * stepping up runs 22…29 and then jumps to 36, stepping down from 36 lands on
 * 29, typing 30 blocks sending. The real backend endpoints are built in
 * parallel (U1/U2) — this story exercises the exact same client contract.
 */
const InteractiveExample = () => {
    const allocation = useIdAllocation({ client: workedExampleIdAllocationClient });

    return (
        <div style={{ maxWidth: 360 }}>
            <IdAllocationField allocation={allocation} label="Träger-ID" />
        </div>
    );
};

const staticAllocation = (overrides: Partial<UseIdAllocationResult>): UseIdAllocationResult => ({
    mode: 'auto',
    value: undefined,
    validation: 'auto',
    canSubmit: true,
    stepUpDisabled: false,
    stepDownDisabled: false,
    setManualValue: () => {},
    step: () => {},
    resetToAuto: () => {},
    reserveForSubmit: async () => {},
    releaseReservation: async () => {},
    consumeReservation: () => {},
    ...overrides,
});

const meta = {
    title: 'Molecules/IdAllocationField',
    component: InteractiveExample,
    parameters: { layout: 'padded' },
} satisfies Meta<typeof InteractiveExample>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Play with the worked example: Auto → arrows adopt 21, up runs 22…29 then 36, typing 30 errors. */
export const Interactive: Story = {};

/** The same field on a small phone (390×844, #570 acceptance) — states must stay readable and reachable. */
export const InteractiveMobile: Story = {
    parameters: {
        viewport: {
            options: {
                phone390: { name: 'Phone 390×844', styles: { width: '390px', height: '844px' } },
            },
        },
    },
    globals: { viewport: { value: 'phone390', isRotated: false } },
};

const StateGallery = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 360 }}>
        <IdAllocationField allocation={staticAllocation({})} label="Auto (Standard)" />
        <IdAllocationField
            allocation={staticAllocation({ mode: 'manual', value: undefined, validation: 'empty', canSubmit: false })}
            label="Manuell, leer"
        />
        <IdAllocationField
            allocation={staticAllocation({ mode: 'manual', value: 21, validation: 'checking', canSubmit: false })}
            label="Prüfung läuft"
        />
        <IdAllocationField
            allocation={staticAllocation({ mode: 'manual', value: 21, validation: 'available' })}
            label="Frei"
        />
        <IdAllocationField
            allocation={staticAllocation({ mode: 'manual', value: 30, validation: 'reserved', canSubmit: false })}
            label="Reserviert"
        />
        <IdAllocationField
            allocation={staticAllocation({ mode: 'manual', value: 5, validation: 'assigned', canSubmit: false })}
            label="Vergeben"
        />
        <IdAllocationField
            allocation={staticAllocation({ mode: 'manual', value: 21, validation: 'error', canSubmit: false })}
            label="Service-Fehler"
        />
    </div>
);

/** All validation states side by side: Auto, empty, checking, available, reserved, assigned, service error. */
export const AllStates: Story = {
    render: () => <StateGallery />,
};
