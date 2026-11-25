import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- exports-map subpath resolves for TypeScript and Vite
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { http, HttpResponse } from 'msw';
import { setSessionTokens } from '../../api/auth/tokenSessionStore';
import { TourLauncher } from './TourLauncher';
import { tourLaunchStore } from './tourLaunchStore';
import { resetTourLauncherPreference } from './tourLauncherPreference';

const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '');

const progressHandler = http.get('*/service/users/tutorials/progress', () =>
    HttpResponse.json([{ surface: 'admin', tourId: 'admin-introduction', tourVersion: 1, status: 'in_progress' }]),
);

const meta = {
    title: 'Molecules/ProductTour/TourLauncher',
    component: TourLauncher,
    parameters: {
        layout: 'fullscreen',
        msw: { handlers: [progressHandler] },
        docs: {
            description: {
                component:
                    'The "?" tour launcher: the Admin M3FabMenu (action variant) pinned bottom-right. Lists the tours of the admin audience with their status and links to the profile tour card. Hidden while a tour runs and when the per-user switch is off.',
            },
        },
    },
    decorators: [
        (Story) => {
            setSessionTokens(
                `${encode({ alg: 'none' })}.${encode({
                    sub: 'story-admin',
                    realm_access: { roles: ['agency-admin'] },
                })}.x`,
                'refresh',
            );
            tourLaunchStore.reset();
            try {
                window.localStorage.removeItem('oriso.admin.tourLauncher.visible.story-admin');
            } catch {
                // Storage may be blocked; the launcher defaults to visible.
            }
            resetTourLauncherPreference();
            return (
                <div style={{ minHeight: 560 }}>
                    <Story />
                </div>
            );
        },
    ],
} satisfies Meta<typeof TourLauncher>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {
    play: async ({ canvas }) => {
        const fab = await canvas.findByRole('button', { name: 'Rundgänge öffnen' });
        await expect(fab).toHaveAttribute('aria-expanded', 'false');
        await expect(fab.closest('[data-admin-tour-launcher]')).toHaveStyle({ position: 'fixed' });
    },
};

export const Open: Story = {
    play: async ({ canvas }) => {
        await userEvent.click(await canvas.findByRole('button', { name: 'Rundgänge öffnen' }));
        const menu = within(canvas.getByRole('list'));
        const intro = await menu.findByRole('button', { name: 'Einführung in die Verwaltung' });
        await waitFor(() => expect(intro).toHaveAccessibleDescription('In Bearbeitung'));
        await expect(menu.getByRole('link', { name: 'Rundgänge verwalten' })).toHaveAttribute('href', '/admin/profil/');
        await expect(canvas.getByRole('button', { name: 'Rundgänge schließen' })).toBeVisible();
    },
};

/** Phone 390 with the floating bottom bar stand-in: the launcher sits above it, never on it. */
export const Phone390: Story = {
    globals: { viewport: { value: 'phone', isRotated: false } },
    decorators: [
        (Story) => (
            <>
                <Story />
                <div
                    data-admin-mobile-nav
                    style={{ position: 'fixed', zIndex: 950, right: 6, bottom: 6, left: 6, pointerEvents: 'none' }}
                >
                    <div
                        style={{
                            height: 72,
                            borderRadius: 36,
                            background: 'var(--m3-surface-container-lowest, #ffffff)',
                            boxShadow: '0 2px 6px rgb(0 0 0 / 15%)',
                        }}
                    />
                </div>
            </>
        ),
    ],
    play: async ({ canvas, canvasElement }) => {
        const fab = await canvas.findByRole('button', { name: 'Rundgänge öffnen' });
        const nav = canvasElement.ownerDocument.querySelector('[data-admin-mobile-nav] > div') as HTMLElement;
        await waitFor(() =>
            expect(fab.getBoundingClientRect().bottom).toBeLessThanOrEqual(nav.getBoundingClientRect().top),
        );
        await userEvent.click(fab);
        const stack = canvasElement.ownerDocument.querySelector('[data-admin-fab-menu-stack]') as HTMLElement;
        await waitFor(() => expect(stack.getBoundingClientRect().left).toBeGreaterThanOrEqual(0));
    },
};
