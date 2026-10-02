import type { Meta, StoryObj } from '@storybook/react-vite';
import { ThemeProvider } from '@mui/material/styles';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, fn } from 'storybook/test';
import { ContactSettings } from './index';
import { orisoMuiTheme } from '../../../../../theme/orisoMuiTheme';

const traegerDpo = {
    nameAndLegalForm: 'Dr. Maria Muster',
    postcode: '79106',
    city: 'Freiburg',
    email: 'datenschutz@caritas-musterstadt.de',
};

const meta = {
    title: 'Pages/Agency/Edit/ContactSettings',
    component: ContactSettings,
    parameters: { layout: 'padded' },
    decorators: [
        (Story) => (
            <ThemeProvider theme={orisoMuiTheme}>
                <div style={{ maxWidth: 520 }}>
                    <Story />
                </div>
            </ThemeProvider>
        ),
    ],
    args: { onSave: fn(), traegerDpo },
} satisfies Meta<typeof ContactSettings>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Admin#1067: no own DPO → the Träger's is shown as "geerbt vom Träger". */
export const InheritedFromTraeger: Story = {
    args: { initialValues: { dataProtection: { dataProtectionResponsibleEntity: 'AGENCY_RESPONSIBLE' } } },
    play: async ({ canvas }) => {
        await expect(canvas.getByTestId('agency-inherited-dpo')).toHaveTextContent('geerbt vom Träger');
    },
};

/** Its own DPO overrides the Träger's, so no inherited value is shown. */
export const OwnDpo: Story = {
    args: {
        initialValues: {
            dataProtection: {
                dataProtectionResponsibleEntity: 'DATA_PROTECTION_OFFICER',
                dataProtectionOfficerContact: {
                    nameAndLegalForm: 'Anna Agentur',
                    postcode: '79098',
                    city: 'Freiburg',
                    phoneNumber: '0761 1234',
                    email: 'dsb@beratungsstelle.de',
                },
            },
        },
    },
    play: async ({ canvas }) => {
        await expect(canvas.queryByTestId('agency-inherited-dpo')).toBeNull();
    },
};
