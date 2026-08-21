import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import { TimeslotField } from './index';
import type { OpeningHoursSlot } from '../../utils/openingHours';

/**
 * Structured opening hours (Figma Admin.ORISO 295-6112 "Timeslot Field"): weekday
 * plus start/end per row, replacing the free textarea. Stored as canonical JSON
 * inside the existing `openingHours` string, so no contract change is involved.
 */
const meta: Meta<typeof TimeslotField> = {
    title: 'Molecules/TimeslotField',
    component: TimeslotField,
    parameters: {
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/QfsgojtHQzBjbzU3Im9Cet/Admin.ORISO?node-id=295-6112',
        },
    },
    decorators: [
        (Story) => (
            <ThemeProvider theme={orisoMuiTheme}>
                <div
                    style={{
                        maxWidth: 520,
                        padding: 24,
                        borderRadius: 28,
                        background: 'var(--admin-form-card-surface, #eae7e8)',
                    }}
                >
                    <Story />
                </div>
            </ThemeProvider>
        ),
    ],
};

export default meta;

type Story = StoryObj<typeof TimeslotField>;

const filled: OpeningHoursSlot[] = [
    { fromDay: 'MONDAY', from: '10:00', untilDay: 'MONDAY', until: '11:00' },
    { fromDay: 'WEDNESDAY', from: '14:00', untilDay: 'WEDNESDAY', until: '16:00' },
];

/** Live editing: add, remove and change slots. */
export const Editable: Story = {
    render: function Render() {
        const [slots, setSlots] = useState<OpeningHoursSlot[]>(filled);
        return <TimeslotField value={slots} onChange={setSlots} />;
    },
};

/** Nothing set yet — an empty state instead of a bare button. */
export const Empty: Story = {
    render: function Render() {
        const [slots, setSlots] = useState<OpeningHoursSlot[]>([]);
        return <TimeslotField value={slots} onChange={setSlots} />;
    },
};

/** A slot may cross midnight, which is why both rows carry a weekday. */
export const CrossesMidnight: Story = {
    render: () => (
        <TimeslotField
            value={[{ fromDay: 'FRIDAY', from: '22:00', untilDay: 'SATURDAY', until: '02:00' }]}
            onChange={() => {}}
        />
    ),
};

/** Free text from before structured slots: shown read-only, never overwritten. */
export const WithLegacyText: Story = {
    render: function Render() {
        const [slots, setSlots] = useState<OpeningHoursSlot[]>([]);
        return (
            <TimeslotField value={slots} legacyText={'Mo–Fr 9–17 Uhr\nTermine nach Vereinbarung'} onChange={setSlots} />
        );
    },
};

/** Read-only card state: visible but not operable. */
export const ReadOnly: Story = {
    render: () => <TimeslotField value={filled} disabled onChange={() => {}} />,
};
