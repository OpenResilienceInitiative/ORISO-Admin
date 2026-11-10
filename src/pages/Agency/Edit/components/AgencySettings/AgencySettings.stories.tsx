import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect } from 'react';
import { Form } from 'antd';
import { http, HttpResponse } from 'msw';
import { ThemeProvider } from '@mui/material/styles';
// eslint-disable-next-line import/no-unresolved -- valid `storybook` package-exports subpath; the eslint resolver predates exports maps
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { orisoMuiTheme } from '../../../../../theme/orisoMuiTheme';
import { UserRole } from '../../../../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../../../../utils/storybook/adminStoryDecorators';
import { findPopup, popupsOf } from '../../../../../test/storyPopups';
import { AgencySettings } from './index';

const FormValue = () => {
    const value = Form.useWatch(['settings', 'counsellorTopicPermission']);
    return <output data-testid="topic-permission-value">{String(value)}</output>;
};

/** Settings card of an existing Beratungsstelle, incl. the topic permission default for invited counsellors. */
const meta: Meta<typeof AgencySettings> = {
    title: 'Organisms/Agency/AgencySettings',
    component: AgencySettings,
    parameters: { msw: { handlers: [http.get('*/service/topic/', () => HttpResponse.json([]))] } },
    decorators: [
        (Story) => (
            <ThemeProvider theme={orisoMuiTheme}>
                <Form
                    layout="vertical"
                    style={{ maxWidth: 560, padding: 24 }}
                    initialValues={{ teamAgency: false, settings: { counsellorTopicPermission: 'CREATE' } }}
                >
                    <Story />
                    <FormValue />
                </Form>
            </ThemeProvider>
        ),
        withAdminProviders,
    ],
    args: { isEditMode: true, asFields: true, persistedTeamAgency: false },
};

export default meta;
type Story = StoryObj<typeof AgencySettings>;

/** The agency default is a select with the three levels; changing it writes the form value. */
export const CounsellorTopicPermissionDefault: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const body = within(canvasElement.ownerDocument.body);
        const field = await canvas.findByRole('combobox', {
            name: /Themen & Fachbereiche neuer Berater:innen|Topics & departments of new counsellors/,
        });
        await waitFor(() =>
            expect((field as HTMLInputElement).value).toMatch(/Darf weitere Themen anlegen|may create/i),
        );
        await userEvent.click(field);
        await userEvent.click(
            await body.findByRole('option', { name: /Darf weitere Fachbereiche auswählen|may select/i }),
        );
        await waitFor(() => expect(canvas.getByTestId('topic-permission-value')).toHaveTextContent('SELECT_EXISTING'));
    },
};

/** Creating a Beratungsstelle: the default is not offered — a new agency starts with „Keine weiteren Fachbereiche". */
export const CreateModeWithoutDefault: Story = {
    args: { isEditMode: false },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(
            canvas.queryByRole('combobox', {
                name: /Themen & Fachbereiche neuer Berater:innen|Topics & departments of new counsellors/,
            }),
        ).toBeNull();
    },
};

let tenantRequests = 0;
let tenantsRecovered = false;
/**
 * AG3: a platform admin opens the settings and the Träger list cannot be loaded - one error pop-up with
 * "Erneut versuchen"; the select keeps quiet text. The retry asks again and the select fills.
 */
export const TenantsLoadErrorRetry: Story = {
    decorators: [
        (Story) => {
            // Edit mode shows the tenant of the agency in a disabled select: it names it once the list has loaded.
            const form = Form.useFormInstance();
            useEffect(() => form.setFieldValue('tenantId', 3), [form]);
            return <Story />;
        },
    ],
    parameters: {
        msw: {
            handlers: [
                http.get('*/service/topic/', () => HttpResponse.json([])),
                http.get('*/service/tenantadmin/search*', () => {
                    tenantRequests += 1;
                    return tenantsRecovered
                        ? HttpResponse.json({ _embedded: [{ _embedded: { id: 3, name: 'Träger Nord' } }], total: 1 })
                        : new HttpResponse(null, { status: 500 });
                }),
            ],
        },
    },
    beforeEach: () => {
        tenantRequests = 0;
        tenantsRecovered = false;
        setStoryAuth([UserRole.AgencyAdmin, UserRole.TenantAdmin], 0);
    },
    play: async ({ canvasElement }) => {
        const popup = await findPopup(canvasElement, 'Träger konnten nicht geladen werden', 'error');
        await expect(popup).toHaveTextContent('Beratungsstelle');
        await expect(within(canvasElement).getByText('Dieser Bereich konnte nicht geladen werden.')).toBeVisible();
        const before = tenantRequests;
        tenantsRecovered = true;
        await userEvent.click(within(popup).getByRole('button', { name: /Erneut/ }));
        await waitFor(() => expect(tenantRequests).toBeGreaterThan(before));
        await waitFor(() => expect(popupsOf(canvasElement)).toHaveLength(0));
        // The response reached the select: the disabled field names the Träger.
        await waitFor(() => expect(within(canvasElement).getByDisplayValue('Träger Nord')).toBeVisible());
    },
};
