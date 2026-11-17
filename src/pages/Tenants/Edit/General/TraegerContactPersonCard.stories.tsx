import type { Meta, StoryObj } from '@storybook/react-vite';
import { ThemeProvider } from '@mui/material/styles';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, fn } from 'storybook/test';
import { orisoMuiTheme } from '../../../../theme/orisoMuiTheme';
import { CANDIDATES, PETRA, TOM } from '../../../../components/ContactPerson/contactPersonFixtures';
import { TraegerContactPersonCard } from './TraegerContactPersonCard';

/**
 * ORISO-Admin#1534: the Träger default contact person for all its centres plus the
 * general contact e-mail. Data shaped like `GET /useradmin/tenants/{id}/contactperson`.
 */
const meta = {
    title: 'Träger/Default contact person tile',
    component: TraegerContactPersonCard,
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
        data: { tenantId: 7, contact: PETRA, deputy: TOM, generalContactEmail: 'info@caritas-sued.example' },
    },
} satisfies Meta<typeof TraegerContactPersonCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default contact, deputy and the general contact e-mail are set. */
export const DefaultSet: Story = {
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('textbox', { name: /Allgemeine Kontakt-Mail/ })).toHaveValue(
            'info@caritas-sued.example',
        );
    },
};

/** Nothing set yet: centres without their own contact fall back to their admins. */
export const NothingSet: Story = {
    args: { data: { tenantId: 7, contact: null, deputy: null, generalContactEmail: null } },
};

/** Editing, as a Träger admin would after pressing "Bearbeiten". */
export const Editing: Story = {
    args: { editMode: true },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('combobox', { name: /^Vertretung/ })).toBeEnabled();
    },
};
