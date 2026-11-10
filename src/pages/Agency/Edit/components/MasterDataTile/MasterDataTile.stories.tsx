import type { Meta, StoryObj } from '@storybook/react-vite';
import { ThemeProvider } from '@mui/material/styles';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export is not resolved by ESLint.
import { expect, userEvent, within } from 'storybook/test';
import { orisoMuiTheme } from '../../../../../theme/orisoMuiTheme';
import { CardEditable } from '../../../../../components/CardEditable';
import { TileSections } from '../../../../../components/TileSections';
import { MuiSwitchField } from '../../../../../components/mui/MuiSwitchField';
import { withAdminProviders } from '../../../../../utils/storybook/adminStoryDecorators';
import {
    AgencyRouteFrame,
    agencyEditHandlers,
    installAgencyStoryAuth,
    storyTopics,
    TRAEGER_ID,
} from '../../agencyEditStoryHarness.matrix';
import { AgencyMasterDataTile } from './index';

const initialValues = {
    name: 'Beratungsstelle Nordlicht',
    postcode: '10115',
    city: 'Berlin',
    street: 'Beispielstraße',
    houseNumber: '12',
    country: 'Deutschland',
    email: 'nordlicht@example.org',
    openingHours: 'Mo bis Fr 9 bis 16 Uhr',
    description: 'Beratung für Schwangere und Familien.',
    tenantId: TRAEGER_ID,
    online: true,
    teamAgency: false,
    topicIds: storyTopics.map(({ id, name }) => ({ value: String(id), label: name })),
    postCodes: [{ from: '00000', until: '99999' }],
    postCodeRangesActive: false,
};

const meta = {
    title: 'Settings/Beratungsstellen/Stammdaten & Mehr/MasterDataTile',
    id: 'admin-agency-master-data-tile',
    component: AgencyMasterDataTile,
    parameters: { layout: 'padded', msw: { handlers: agencyEditHandlers } },
    args: {
        initialValues,
        onSave: () => undefined,
        departmentFieldRequest: 0,
        persistedTeamAgency: false,
    },
    decorators: [
        (Story) => {
            installAgencyStoryAuth('platformAdmin');
            return withAdminProviders(() => (
                <AgencyRouteFrame>
                    <ThemeProvider theme={orisoMuiTheme}>
                        <Story />
                    </ThemeProvider>
                </AgencyRouteFrame>
            ));
        },
    ],
} satisfies Meta<typeof AgencyMasterDataTile>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Read mode: three white panels in one tile, every field locked. */
export const ReadMode: Story = {};

/** After "Bearbeiten" the whole tile is editable and saved together. */
export const Editing: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole('button', { name: /Bearbeiten/ }));
        await expect(await canvas.findByRole('button', { name: /Speichern/ })).toBeVisible();
    },
};

/** The same switch the Träger tiles use, in its four states: on, off, on and locked, off and locked. */
export const SwitchStates: Story = {
    render: () => (
        <CardEditable
            titleKey="agency.form.settings.teamAdviceCenter.title"
            variant="dialog"
            editMode
            initialValues={{ on: true, off: false, lockedOn: true, lockedOff: false }}
        >
            <TileSections>
                <TileSections.Section id="switch-states" title="Schalter">
                    <MuiSwitchField name="on" label="An" />
                    <MuiSwitchField name="off" label="Aus" />
                    <MuiSwitchField name="lockedOn" label="An, gesperrt" disabled />
                    <MuiSwitchField name="lockedOff" label="Aus, gesperrt" disabled />
                </TileSections.Section>
            </TileSections>
        </CardEditable>
    ),
    play: async ({ canvasElement }) => {
        const switches = within(canvasElement).getAllByRole('switch');
        await expect(switches).toHaveLength(4);
        await expect(switches[0]).toBeChecked();
        await expect(switches[1]).not.toBeChecked();
        await expect(switches[2]).toBeDisabled();
        await expect(switches[3]).toBeDisabled();
    },
};
