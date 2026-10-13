import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved
import { expect, userEvent, within, waitFor } from 'storybook/test';
import { http, HttpResponse } from 'msw';
import i18n from '../../i18n';
import { ManagedEntityStatus } from '.';
import managedMeta, { ReadbackUnavailable } from './EntityStatusCard.stories';

const meta = {
    ...managedMeta,
    title: 'Organisms/EntityStatus/SettingsPresentation',
} satisfies Meta<typeof ManagedEntityStatus>;
export default meta;
type Story = StoryObj<typeof meta>;

/** The same HTTP/readback consumer at the reported phone width. */
export const ReadbackSettingsGerman390: Story = {
    ...ReadbackUnavailable,
    decorators: [
        (Story) => (
            <div style={{ width: 390, maxWidth: '100%' }}>
                <Story />
            </div>
        ),
    ],
    globals: { viewport: { value: 'phone', isRotated: false } },
    play: async (context) => {
        await ReadbackUnavailable.play?.(context);
        const canvas = within(context.canvasElement);
        const error = canvas.getByTestId('entity-status-error');
        await expect(canvas.getAllByRole('alert')).toHaveLength(1);
        await expect(within(error).getByRole('button', { name: i18n.t('entityStatus.reload') })).toBeVisible();
        const actions = canvas.getByTestId('entity-status-actions');
        await expect(within(actions).getAllByRole('button')).toHaveLength(2);
        const buttons = within(actions).getAllByRole('button');
        await expect(
            Math.abs(buttons[0].getBoundingClientRect().top - buttons[1].getBoundingClientRect().top),
        ).toBeLessThan(1);
        await expect(
            Math.abs(buttons[0].getBoundingClientRect().width - buttons[1].getBoundingClientRect().width),
        ).toBeLessThan(1);
        const card = canvas.getByTestId('entity-status-card');
        await expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth);
    },
};

const settingsLayout = (width: number, language: 'de' | 'en'): Story => ({
    beforeEach: async () => {
        await managedMeta.beforeEach();
        await i18n.changeLanguage(language);
    },
    decorators: [
        (Story) => (
            <div style={{ width, maxWidth: '100%' }}>
                <Story />
            </div>
        ),
    ],
    parameters: {
        viewport: {
            options: { settings: { name: `Settings ${width}`, styles: { width: `${width}px`, height: '1000px' } } },
        },
        msw: managedMeta.parameters.msw,
    },
    globals: { viewport: { value: 'settings', isRotated: false } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await waitFor(() => expect(canvas.getByTestId('account-security-info')).toHaveTextContent('selected-account'));
        const card = canvas.getByTestId('entity-status-card');
        await expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth);
        await expect(canvas.getByTestId('2fa-required')).toBeVisible();
        const details = canvas.getByRole('group', { name: i18n.t('entityStatus.accountDetails') });
        const security = canvas.getByRole('group', { name: i18n.t('entityStatus.twoFactor.title') });
        await expect(
            within(security).getByText(i18n.t('entityStatus.twoFactor.short.configured') as string),
        ).toBeVisible();
        const detailsRect = details.getBoundingClientRect();
        const securityRect = security.getBoundingClientRect();
        if (canvas.getByTestId('entity-status-card').clientWidth >= 640) {
            await expect(Math.abs(detailsRect.top - securityRect.top)).toBeLessThan(1);
            await expect(securityRect.left).toBeGreaterThan(detailsRect.right);
        } else {
            await expect(securityRect.top).toBeGreaterThanOrEqual(detailsRect.bottom);
        }
    },
});
export const SettingsGerman320: Story = settingsLayout(320, 'de');
export const SettingsEnglish390: Story = settingsLayout(390, 'en');
export const SettingsGerman412: Story = settingsLayout(412, 'de');
export const SettingsEnglishTablet820: Story = settingsLayout(820, 'en');
export const SettingsGermanDesktop1440: Story = settingsLayout(1440, 'de');

/** Longest status instruction and entity caption, through the existing public props. */
export const SettingsLongTextGerman320: Story = {
    ...settingsLayout(320, 'de'),
    args: {
        entityName: 'Beratungsstelle mit einem besonders langen Namen für die gemeinsame Unterstützung und Beratung',
        activationBlockedReason: 'entityStatus.activationTopicsError',
    },
    parameters: {
        ...settingsLayout(320, 'de').parameters,
        msw: {
            handlers: [
                http.get('*/service/useradmin/accounts/account-1197/status', () =>
                    HttpResponse.json({
                        accountId: 'account-1197',
                        username: 'selected-account',
                        createDate: '2026-09-01T10:00:00',
                        updateDate: null,
                        active: false,
                        paused: true,
                        restrictions: [],
                        twoFactor: { required: true, configured: true, active: false },
                    }),
                ),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await waitFor(() =>
            expect(canvas.getByTestId('entity-status-confirmed')).toHaveAttribute('data-active', 'false'),
        );
        await userEvent.click(within(canvas.getByTestId('entity-status-edit')).getByRole('button'));
        await userEvent.click(canvas.getByRole('switch'));
        await expect(canvas.getByTestId('entity-status-activation-blocked')).toHaveTextContent(
            i18n.t('entityStatus.activationTopicsError'),
        );
        await expect(within(canvas.getByTestId('entity-status-save')).getByRole('button')).toBeDisabled();
        const card = canvas.getByTestId('entity-status-card');
        await expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth);
        await expect(canvas.getByTestId('2fa-configured')).toHaveAttribute('data-state', 'true');
    },
};
