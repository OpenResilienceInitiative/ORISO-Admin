import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, fn } from 'storybook/test';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../../../../theme/orisoMuiTheme';
import { DepartmentDetailsCard } from './index';
import { serializeOpeningHours, type OpeningHoursSlot } from '../../../../../utils/openingHours';

const weekdays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'] as const;
const slotsFor = (from: string, until: string): OpeningHoursSlot[] =>
    weekdays.map((day) => ({ fromDay: day, from, untilDay: day, until }));

/**
 * Story for the per-Fachbereich contact detail overrides card (ORISO-Admin#197: a center may run
 * several Fachbereiche at different floors/areas with different hours). Renders the presentational
 * card directly, so the inheritance affordance ("empty = inherits the Beratungsstelle value") can
 * be reviewed without a backend or login. Persisted are only overrides; the container wires the
 * card to GET/PUT /agencyadmin/agencies/{agencyId}/topics/{topicId}/details.
 */
const meta: Meta<typeof DepartmentDetailsCard> = {
    title: 'Organisms/Agency/DepartmentDetails',
    component: DepartmentDetailsCard,
    decorators: [
        (Story) => (
            <ThemeProvider theme={orisoMuiTheme}>
                <div style={{ maxWidth: 720, padding: 24 }}>
                    <Story />
                </div>
            </ThemeProvider>
        ),
    ],
    args: {
        departments: [
            { id: 3, name: 'U25 Suizidprävention' },
            { id: 4, name: 'Schuldnerberatung' },
        ],
        selected: 3,
        inherited: { openingHours: 'Mo-Fr 9-17 Uhr', floorLocation: 'Haus B' },
    },
};

export default meta;

type Story = StoryObj<typeof DepartmentDetailsCard>;

/** Structured hours (Mo–Fr, one weekday closed on top): the weekday rows with clock, phone and floor icons. */
export const StructuredHours: Story = {
    args: {
        initialValues: {
            openingHours: serializeOpeningHours(slotsFor('14:00', '18:00').slice(1, 4)),
            phoneExtension: '-23',
            floorLocation: '3. OG, Raum 312',
        },
        inherited: { openingHours: serializeOpeningHours(slotsFor('09:00', '17:00')), floorLocation: 'Haus B' },
    },
};

/** Longest German text in every field, plus a structured inherited value in the hint. */
export const LongestGermanText: Story = {
    args: {
        departments: [{ id: 3, name: 'Schuldner- und Insolvenzberatung für Familien und junge Erwachsene' }],
        initialValues: {
            openingHours: serializeOpeningHours(slotsFor('08:00', '12:00').concat(slotsFor('13:00', '18:30'))),
            phoneExtension: '-1234 (Durchwahl Sekretariat)',
            floorLocation: 'Verwaltungsgebäude Nord, 3. Obergeschoss, Raum 312',
        },
        inherited: { openingHours: serializeOpeningHours(slotsFor('09:00', '17:00')) },
    },
};

/** Department with its own overrides: all three fields carry stored values (hours here are legacy free text). */
export const WithOverrides: Story = {
    args: {
        initialValues: {
            openingHours: 'Di+Do 14-18 Uhr',
            phoneExtension: '-23',
            floorLocation: '3. OG, Raum 312',
        },
    },
};

/** Department fully inheriting: empty fields, inherited values shown as placeholder + helper. */
export const Inheriting: Story = {
    args: {
        initialValues: { openingHours: null, phoneExtension: null, floorLocation: null },
    },
};

/**
 * No departments assigned: the card stays visible, names the card and field where a
 * Fachbereich is added, and jumps there (#1069).
 */
export const NoDepartments: Story = {
    args: {
        departments: [],
        selected: undefined,
        onAddDepartment: fn(),
    },
    play: async ({ args, canvas, userEvent }) => {
        await userEvent.click(canvas.getByRole('button', { name: /Fachbereich hinzufügen|Add department/ }));
        await expect(args.onAddDepartment).toHaveBeenCalledTimes(1);
    },
};

/** Failed read: editing is blocked so a save cannot wipe real overrides; retry offered. */
export const LoadError: Story = {
    args: {
        isError: true,
    },
};
