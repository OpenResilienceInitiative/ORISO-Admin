import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- exports-map subpath resolves in Storybook/Vite
import { expect, userEvent, waitFor, within } from 'storybook/test';
import i18n from '../../../i18n';
import {
    applyAdminInvertedTheme,
    applyAdminTheme,
    clearAdminInvertedThemeTokens,
} from '../../../utils/applyAdminTheme';
import { tenantEditDecorator, tenantEditHandlers } from './tenantEditStoryHarness';

/**
 * The Träger edit page of a platform admin (`/admin/tenants/:id/...`), one story per tab, with the
 * real sticky header, the underline tab bar and the tab's own tiles. Check each at 1440 and 390 wide.
 */
const meta = {
    title: 'Admin/Tenant/Tabs',
    parameters: { layout: 'fullscreen', msw: { handlers: tenantEditHandlers } },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Master data only (Frank, 2026-11-20): licence and sender moved to the tab "Weitere". */
export const MasterData: Story = {
    decorators: [tenantEditDecorator('general')],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await canvas.findByRole('group', { name: String(i18n.t('tenants.form.section.general')) }, { timeout: 8000 });
        await expect(canvas.queryByRole('group', { name: String(i18n.t('tenants.form.section.sender')) })).toBeNull();
        await expect(canvas.queryByDisplayValue('40')).toBeNull();
    },
};

export const Appearance: Story = { decorators: [tenantEditDecorator('theme-settings')] };

export const Legal: Story = { decorators: [tenantEditDecorator('legal-settings')] };

export const Introduction: Story = { decorators: [tenantEditDecorator('erstantwort')] };

export const EmailServer: Story = { decorators: [tenantEditDecorator('smtp')] };

/**
 * ORISO-Admin#1577: the same tiles as the platform page. The Live Chat tile is there, with this Träger's chat links
 * on it (not in a card of its own), and the page intro says that changes apply to this Träger only. The former
 * Funktionalitäten tab (now "Weitere") gave up Team-Chat and supervision (each its own tile after the
 * conversation types).
 */
export const FunctionalityAccess: Story = {
    decorators: [tenantEditDecorator('global-settings')],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const liveChat = await canvas.findByTestId('chat-type-card-liveChat', {}, { timeout: 8000 });
        await expect(
            await within(liveChat).findByRole('region', { name: i18n.t('liveChatLinks.title') }, { timeout: 8000 }),
        ).toBeInTheDocument();
        await expect(canvas.getAllByRole('region', { name: i18n.t('liveChatLinks.title') })).toHaveLength(1);
        await expect(
            within(canvas.getByTestId('permissions-intro')).getByText(
                String(i18n.t('tenants.globalSettings.superAdminWarning.description')),
            ),
        ).toBeVisible();
        await expect(canvas.getByTestId('supervision-tile')).toBeVisible();
        await expect(canvas.getByTestId('team-chat-tile')).toBeVisible();
        const page = canvasElement.ownerDocument.documentElement;
        await expect(page.scrollWidth).toBeLessThanOrEqual(page.clientWidth);
    },
};

/**
 * ORISO-Admin#1577: the tab "Weitere" (formerly Funktionalitäten): topics and counsellor statistics; since
 * Frank's decision of 2026-11-20 also licence and sender of the Träger, as a tile with its own save.
 */
export const More: Story = {
    decorators: [tenantEditDecorator('functionalities')],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const section = await canvas.findByRole(
            'group',
            { name: String(i18n.t('tileHelp.otherFunctions.general.title')) },
            { timeout: 8000 },
        );
        await expect(within(section).getAllByRole('switch')).toHaveLength(2);
        await canvas.findByDisplayValue('40', {}, { timeout: 8000 });
        await expect(canvas.getByRole('group', { name: String(i18n.t('tenants.form.section.sender')) })).toBeVisible();
        await expect(canvas.getAllByText(String(i18n.t('tenants.edit.tabs.appSettings'))).length).toBeGreaterThan(0);
        const page = canvasElement.ownerDocument.documentElement;
        await expect(page.scrollWidth).toBeLessThanOrEqual(page.clientWidth);
    },
};

/** The platform admin's "create Träger" dialog (`/admin/tenants/add`): the Träger's parts and the first admin as panels. */
export const CreateTenant: Story = { decorators: [tenantEditDecorator('general', 'add')] };

const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = (rgb: string) => {
    const [r, g, b] = (rgb.match(/[\d.]+/g) ?? ['0', '0', '0']).slice(0, 3).map((part) => channel(Number(part)));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
    const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (light + 0.05) / (dark + 0.05);
};
const PANEL = '[role="group"]';

/** The white panels on the inverted (dark) scheme: labels and helper text keep 4.5:1 against the panel (WCAG 1.4.3). */
export const MasterDataInvertedScheme: Story = {
    decorators: [tenantEditDecorator('general')],
    play: async ({ canvasElement }) => {
        await waitFor(() => expect(canvasElement.querySelectorAll(PANEL).length).toBeGreaterThan(1), { timeout: 8000 });
        try {
            applyAdminInvertedTheme({ primaryColor: '#A5000A' });
            const panels = [...canvasElement.querySelectorAll(PANEL)];
            await waitFor(() => expect(getComputedStyle(panels[0]).backgroundColor).not.toBe('rgb(255, 255, 255)'));
            // The label colour is animated by MUI; wait until it has settled on the scheme's colour.
            const tooFaint = () => {
                const found: string[] = [];
                panels.forEach((panel) => {
                    const surface = getComputedStyle(panel).backgroundColor;
                    panel.querySelectorAll('label, .MuiFormHelperText-root').forEach((element) => {
                        const ratio = contrast(getComputedStyle(element).color, surface);
                        const words = (element.textContent ?? '')
                            .replace(/\u200b/g, '')
                            .trim()
                            .slice(0, 30);
                        if (words && ratio < 4.5) found.push(`${words} ${ratio.toFixed(2)}`);
                    });
                });
                return found;
            };
            await waitFor(() => expect(tooFaint()).toEqual([]), { timeout: 4000 });
        } finally {
            // The light palette does not name every token the inverted one sets, so clear those first.
            clearAdminInvertedThemeTokens(document.documentElement);
            applyAdminTheme({ primaryColor: '#A5000A' });
            // Colours are animated: hand the story back to the accessibility audit only once they have settled.
            // The status panel has no field label; take the first panel that has one.
            const panel = [...canvasElement.querySelectorAll(PANEL)].find((candidate) =>
                candidate.querySelector('label'),
            );
            const label = panel?.querySelector('label');
            await waitFor(() => {
                expect(getComputedStyle(panel!).backgroundColor).toBe('rgb(255, 255, 255)');
                expect(getComputedStyle(label!).color).toBe('rgb(68, 71, 72)');
            });
        }
    },
};

/** An invalid first admin username: the error's last line stays clear of the next field's floating label. */
export const CreateTenantWithErrors: Story = {
    decorators: [tenantEditDecorator('general', 'add')],
    play: async ({ canvasElement }) => {
        await waitFor(
            () =>
                expect(
                    canvasElement.querySelector('#tenantAdminUsername, input[name="tenantAdminUsername"]'),
                ).not.toBeNull(),
            {
                timeout: 8000,
            },
        );
        const username = canvasElement.querySelector<HTMLInputElement>(
            '#tenantAdminUsername, input[name="tenantAdminUsername"]',
        )!;
        await userEvent.click(username);
        await userEvent.type(username, 'a b');
        await userEvent.tab();

        const errors = (): HTMLElement[] =>
            [...canvasElement.querySelectorAll<HTMLElement>('.MuiFormHelperText-root.Mui-error')].filter((element) =>
                (element.textContent ?? '').replace(/\u200b/g, '').trim(),
            );
        await waitFor(() => expect(errors().length).toBeGreaterThan(0));
        // The error text and the fields below it settle over a few frames before their positions are final.
        await new Promise((resolve) => {
            setTimeout(resolve, 600);
        });
        const gaps = errors().map((error) => {
            const range = document.createRange();
            range.selectNodeContents(error);
            const lines = [...range.getClientRects()];
            const lastLine = lines[lines.length - 1];
            const nextGroup = error.closest('.MuiFormControl-root')?.parentElement?.nextElementSibling;
            const nextLabel = nextGroup?.querySelector('label');
            return nextLabel ? nextLabel.getBoundingClientRect().top - lastLine.bottom : null;
        });
        // At least one error sits above another field; none of them may run into that field's label.
        expect(gaps.filter((gap) => gap !== null).length).toBeGreaterThan(0);
        gaps.forEach((gap) => expect(gap ?? 0).toBeGreaterThanOrEqual(0));
    },
};
