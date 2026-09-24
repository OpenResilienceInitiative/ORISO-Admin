import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from 'antd';
import { ThemeProvider } from '@mui/material/styles';
// eslint-disable-next-line import/no-unresolved -- valid `storybook` package-exports subpath; the eslint resolver predates exports maps
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { orisoMuiTheme } from '../../../../../theme/orisoMuiTheme';
import { withAdminProviders } from '../../../../../utils/storybook/adminStoryDecorators';
import { AgencySettings } from './index';

const FormValue = () => {
    const value = Form.useWatch(['settings', 'counsellorTopicPermission']);
    return <output data-testid="topic-permission-value">{String(value)}</output>;
};

/** Settings card of an existing Beratungsstelle, incl. the topic permission default for invited counsellors. */
const meta: Meta<typeof AgencySettings> = {
    title: 'Organisms/Agency/AgencySettings',
    component: AgencySettings,
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
