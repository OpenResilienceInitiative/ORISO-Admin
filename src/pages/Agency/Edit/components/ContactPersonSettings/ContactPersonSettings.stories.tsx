import type { Meta, StoryObj } from '@storybook/react-vite';
import { ThemeProvider } from '@mui/material/styles';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, fn, screen, userEvent, waitFor } from 'storybook/test';
import { ContactPersonSettings } from './index';
import { orisoMuiTheme } from '../../../../../theme/orisoMuiTheme';
import { CANDIDATES, JONAS, MARIA, PETRA, TOM } from '../../../../../components/ContactPerson/contactPersonFixtures';

/**
 * ORISO-Admin#1534: tile "Ansprechperson" of a Beratungsstelle. Data is shaped like
 * `GET /useradmin/agencies/{id}/contactperson` and its `/candidates`; the tile is not
 * on the edit page yet.
 */
const meta = {
    title: 'Agency/Contact person tile',
    component: ContactPersonSettings,
    parameters: { layout: 'padded' },
    decorators: [
        (Story) => (
            <ThemeProvider theme={orisoMuiTheme}>
                <div style={{ maxWidth: 560 }}>
                    <Story />
                </div>
            </ThemeProvider>
        ),
    ],
    args: {
        candidates: CANDIDATES,
        onSave: fn(),
        data: {
            agencyId: 4711,
            tenantId: 7,
            contact: MARIA,
            deputy: JONAS,
            traegerDefault: { contact: PETRA, deputy: TOM },
            effectiveSource: 'OWN',
        },
    },
} satisfies Meta<typeof ContactPersonSettings>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The centre names its own contact person and deputy; no Träger hint. */
export const OwnContactSet: Story = {
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('combobox', { name: /^Ansprechperson/ })).toHaveValue(
            'Maria Muster (BST-Admin) · ansprechperson@caritas-nord.example',
        );
        await expect(canvas.queryByTestId('contact-person-traeger-default')).toBeNull();
    },
};

/** Nothing set at the centre: the hint names the Träger default that applies. */
export const EmptyWithTraegerDefault: Story = {
    args: {
        data: {
            agencyId: 4711,
            tenantId: 7,
            contact: null,
            deputy: null,
            traegerDefault: { contact: PETRA, deputy: TOM },
            effectiveSource: 'TRAEGER_DEFAULT',
        },
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByTestId('contact-person-traeger-default')).toHaveTextContent(
            'Es gilt der Träger-Standard: Petra Träger (kontakt@caritas-sued.example)',
        );
    },
};

/** Nothing at the centre and no Träger default: counsellors only see the centre's admins. */
export const EmptyWithoutDefault: Story = {
    args: {
        data: {
            agencyId: 4711,
            tenantId: 7,
            contact: null,
            deputy: null,
            traegerDefault: {},
            effectiveSource: 'NONE',
        },
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByTestId('contact-person-no-default')).toBeVisible();
    },
};

/** Editing: the contact picker is open and lists BST and Träger admins. */
export const PickerOpen: Story = {
    args: {
        editMode: true,
        data: {
            agencyId: 4711,
            tenantId: 7,
            contact: null,
            deputy: null,
            traegerDefault: { contact: PETRA },
            effectiveSource: 'TRAEGER_DEFAULT',
        },
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('combobox', { name: /^Vertretung/ })).toBeDisabled();
        await userEvent.click(canvas.getByRole('combobox', { name: /^Ansprechperson/ }));
        await waitFor(() => expect(screen.getByRole('listbox')).toBeVisible());
        await expect(screen.getAllByRole('option')).toHaveLength(4);
    },
};
