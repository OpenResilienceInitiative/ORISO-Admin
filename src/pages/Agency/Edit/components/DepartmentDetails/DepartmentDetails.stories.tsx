import type { Meta, StoryObj } from '@storybook/react-vite';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../../../../theme/orisoMuiTheme';
import { DepartmentDetailsCard } from './index';

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

/** Department with its own overrides: all three fields carry stored values. */
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

/** No departments assigned: the card stays visible with a hint (disable, not hide). */
export const NoDepartments: Story = {
    args: {
        departments: [],
        selected: undefined,
    },
};

/** Failed read: editing is blocked so a save cannot wipe real overrides; retry offered. */
export const LoadError: Story = {
    args: {
        isError: true,
    },
};
