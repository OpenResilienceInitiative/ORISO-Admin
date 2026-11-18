import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, within } from 'storybook/test';
import { UserRole } from '../../../enums/UserRole';
import { setStoryAuth, withSeededAdminProviders } from '../../../utils/storybook/adminStoryDecorators';
import { StatisticsReaderEditOrAdd } from './index';

const READER = {
    id: 'sr-1',
    firstname: 'Sabine',
    lastname: 'Zahl',
    username: 'szahl',
    email: 'sabine.zahl@example.org',
};

const meta = {
    title: 'Organisms/Pages/Users/StatisticsReaderEdit',
    component: StatisticsReaderEditOrAdd,
    parameters: {
        layout: 'fullscreen',
        msw: {
            handlers: [
                http.get('*/service/useradmin/statisticsreaders/sr-1', () => HttpResponse.json({ _embedded: READER })),
            ],
        },
    },
    decorators: [
        (Story) => {
            // Only a platform admin may manage Statistik-Leser·innen (ORISO-UserService#1666).
            setStoryAuth([UserRole.AgencyAdmin, UserRole.TenantAdmin, UserRole.UserAdmin], 0);
            return withSeededAdminProviders(Story);
        },
    ],
} satisfies Meta<typeof StatisticsReaderEditOrAdd>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Create form: name, username and e-mail, plus the note about the password e-mail and 2FA. */
export const Create: Story = {
    render: () => (
        <Routes location="/admin/users/statistics-readers/add">
            <Route path="/admin/users/statistics-readers/:id" element={<StatisticsReaderEditOrAdd />} />
        </Routes>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByText(/Zwei-Faktor-Authentifizierung|two-factor authentication/)).toBeVisible();
    },
};

/** An existing reader, read-only until "Bearbeiten". */
export const Existing: Story = {
    render: () => (
        <Routes location="/admin/users/statistics-readers/sr-1">
            <Route path="/admin/users/statistics-readers/:id" element={<StatisticsReaderEditOrAdd />} />
        </Routes>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByRole('heading', { name: /Sabine Zahl/ })).toBeVisible();
    },
};
