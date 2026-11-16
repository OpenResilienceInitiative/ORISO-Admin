import type { Meta, StoryObj } from '@storybook/react-vite';
import { Col, Form, Row, Space } from 'antd';
import { ThemeProvider } from '@mui/material/styles';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, within } from 'storybook/test';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import { Card } from '../../../components/Card';
import { MuiFormField } from '../../../components/mui/MuiFormField';
import {
    AdminContactEmailField,
    ContactPersonForSection,
    contactRolesInitialValues,
    type ContactPersonForCentre,
} from './index';

/**
 * ORISO-Admin#1534 in the user panel of agency and tenant admins: the optional
 * contact e-mail and "Ansprechperson für". Laid out like the two columns of the
 * edit page; not wired into `users/Edit` or `TenantAdminEdit` yet.
 */

const CENTRES: ContactPersonForCentre[] = [
    { agencyId: 1, agencyName: 'Beratungsstelle Nord', role: 'CONTACT' },
    { agencyId: 2, agencyName: 'Beratungsstelle Süd', role: 'DEPUTY', currentContactName: 'Petra Träger' },
    { agencyId: 3, agencyName: 'Suchtberatung Ost', role: 'NONE', currentContactName: 'Jonas Beispiel' },
    { agencyId: 4, agencyName: 'Schuldnerberatung West', role: 'NONE' },
];

const UserPanel = ({
    centres,
    contactEmail,
    failedCentres,
}: {
    centres: ContactPersonForCentre[];
    contactEmail?: string;
    failedCentres?: string[];
}) => (
    <ThemeProvider theme={orisoMuiTheme}>
        <Form
            layout="vertical"
            size="large"
            initialValues={{
                firstname: 'Maria',
                lastname: 'Muster',
                email: 'm.muster@login.caritas-nord.example',
                contactEmail,
                contactPersonRoles: contactRolesInitialValues(centres),
            }}
        >
            <Row gutter={[20, 10]}>
                <Col xs={24} lg={12}>
                    <Card titleKey="agency.edit.general.general_information">
                        <MuiFormField name="firstname" label="Vorname" />
                        <MuiFormField name="lastname" label="Nachname" />
                        <MuiFormField name="email" label="E-Mail (Login)" />
                        <AdminContactEmailField />
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Space direction="vertical" size={20} style={{ width: '100%' }}>
                        <ContactPersonForSection
                            centres={centres}
                            failedCentres={failedCentres}
                            onRetry={() => undefined}
                        />
                    </Space>
                </Col>
            </Row>
        </Form>
    </ThemeProvider>
);

const meta = {
    title: 'Users/Admin contact e-mail and contact person for',
    component: UserPanel,
    parameters: { layout: 'padded' },
    args: { centres: CENTRES, contactEmail: 'ansprechperson@caritas-nord.example' },
} satisfies Meta<typeof UserPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Contact e-mail set; contact person for one centre, deputy for another. */
export const WithRoles: Story = {
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('textbox', { name: /Kontakt-Mail/ })).toHaveValue(
            'ansprechperson@caritas-nord.example',
        );
        const nord = canvas.getByRole('group', { name: 'Beratungsstelle Nord' });
        await expect(within(nord).getByRole('combobox', { name: 'Rolle' })).toHaveValue('Ansprechperson');
        await expect(canvas.getByText('Derzeit Ansprechperson: Petra Träger')).toBeVisible();
    },
};

/** No contact e-mail (login e-mail shows) and no centre assigned yet. */
export const EmptyAdmin: Story = {
    args: { centres: [], contactEmail: undefined },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('Diesem Admin ist noch keine Beratungsstelle zugeordnet.')).toBeVisible();
    },
};

/** One centre's stored pair could not be read: the section says which one instead of hiding it. */
export const CentreFailedToLoad: Story = {
    args: { centres: CENTRES.slice(0, 1), failedCentres: ['Suchtberatung Ost'] },
    play: async ({ canvas }) => {
        await expect(
            (
                await canvas.findAllByText(
                    'Die Ansprechperson dieser Beratungsstellen konnte nicht geladen werden: Suchtberatung Ost.',
                )
            )[0],
        ).toBeVisible();
        await expect(canvas.getByRole('group', { name: 'Beratungsstelle Nord' })).toBeVisible();
        await expect(canvas.queryByText('Diesem Admin ist noch keine Beratungsstelle zugeordnet.')).toBeNull();
    },
};
