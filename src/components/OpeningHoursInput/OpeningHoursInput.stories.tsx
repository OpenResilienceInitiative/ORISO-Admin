import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import { OpeningHoursInput } from './index';
import { WEEKDAYS, serializeOpeningHours, type OpeningHoursSlot } from '../../utils/openingHours';

/**
 * Opening hours as weekday rows. The stored value is the same string the API and the Frontend
 * already use: a JSON payload `{"version":1,"openingHours":[…]}` inside `openingHours`. Legacy
 * free text and slots across midnight keep working in their own modes (see the stories).
 */
const meta: Meta<typeof OpeningHoursInput> = {
    title: 'Molecules/OpeningHoursInput',
    component: OpeningHoursInput,
    decorators: [
        (Story) => (
            <ThemeProvider theme={orisoMuiTheme}>
                <div style={{ maxWidth: 560, padding: 24 }}>
                    <Story />
                </div>
            </ThemeProvider>
        ),
    ],
};

export default meta;

type Story = StoryObj<typeof OpeningHoursInput>;

const slot = (day: (typeof WEEKDAYS)[number], from: string, until: string): OpeningHoursSlot => ({
    fromDay: day,
    from,
    untilDay: day,
    until,
});

const workweek = serializeOpeningHours(
    (['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY'] as const)
        .map((day) => slot(day, '09:00', '17:00'))
        .concat(slot('FRIDAY', '09:00', '13:00')),
);

/** Controlled wrapper that also prints the stored string, so the serialised value is visible. */
const Controlled = ({ initial, disabled }: { initial: string; disabled?: boolean }) => {
    const [value, setValue] = useState(initial);
    return (
        <>
            <OpeningHoursInput value={value} onChange={setValue} disabled={disabled} />
            <pre
                data-testid="stored-value"
                style={{ marginTop: 16, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 11, opacity: 0.7 }}
            >
                {value || '(empty string)'}
            </pre>
        </>
    );
};

/** Nothing stored: every day is closed. Switch a day on to get 09:00–17:00. */
export const Empty: Story = { render: () => <Controlled initial="" /> };

/** Mo–Th 9–17, Fr 9–13. */
export const Filled: Story = { render: () => <Controlled initial={workweek} /> };

/** Longest realistic case: all seven days open with a lunch break, German labels. */
export const AllDaysSplitShifts: Story = {
    parameters: { i18n: { locale: 'de' } },
    render: () => (
        <Controlled
            initial={serializeOpeningHours(
                WEEKDAYS.flatMap((day) => [slot(day, '08:00', '12:00'), slot(day, '13:00', '18:30')]),
            )}
        />
    ),
};

/** A hand-typed value stays free text; the note says so and offers an explicit switch. */
export const FreeTextFallback: Story = {
    render: () => <Controlled initial="Mo-Fr 9-17 Uhr, nach Vereinbarung auch abends" />,
};

/** A slot over midnight cannot sit in a weekday row, so it is edited as an individual timeslot. */
export const CrossesMidnight: Story = {
    render: () => (
        <Controlled
            initial={serializeOpeningHours([
                { fromDay: 'FRIDAY', from: '22:00', untilDay: 'SATURDAY', until: '02:00' },
            ])}
        />
    ),
};

/** End before start: the range is flagged and is NOT written to the stored value. */
export const InvalidRange: Story = {
    render: () => <Controlled initial={serializeOpeningHours([slot('MONDAY', '09:00', '17:00')])} />,
    play: async ({ canvas, userEvent }) => {
        const until = canvas.getAllByLabelText(/Until|Bis/)[0] as HTMLInputElement;
        await userEvent.clear(until);
        await userEvent.type(until, '0800');
    },
};

/** Read-only (tile not in edit mode): values visible, nothing editable, no add/copy actions. */
export const ReadOnly: Story = { render: () => <Controlled initial={workweek} disabled /> };
