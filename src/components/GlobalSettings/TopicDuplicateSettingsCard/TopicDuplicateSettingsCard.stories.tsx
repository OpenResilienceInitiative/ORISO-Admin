import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export.
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import { CardGrid } from '../../CardGrid';
import { walkThroughTileHelp } from '../../TileHelp/tileHelpStory.matrix';
import { TopicDuplicateSettingsCard } from '.';

/** ORISO-Frontend#1876: only "inform the existing counsellor once" is live; the rest come with #1878. */
const meta = {
    title: 'Settings/Einstellungen/Globale Konfigurationen/TopicDuplicateSettingsCard',
    id: 'organisms-globalsettings-topicduplicatesettingscard',
    component: TopicDuplicateSettingsCard,
    decorators: [
        (Story, { parameters }) => (
            <ThemeProvider theme={orisoMuiTheme}>
                <div style={{ maxWidth: parameters.tileWidth ?? 400 }}>
                    <Story />
                </div>
            </ThemeProvider>
        ),
    ],
    args: { isLoading: false, onSave: fn() },
} satisfies Meta<typeof TopicDuplicateSettingsCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Zwei Beratungen zum gleichen Thema')).toBeVisible();
        await expect(canvas.getByRole('radio', { name: 'Bisherige Berater:in einmal informieren' })).toBeChecked();
    },
};

export const Editing: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: /edit|bearbeiten/i }));
        const radios = canvas.getAllByRole('radio');
        await expect(radios).toHaveLength(4);
        await expect(radios[0]).toBeEnabled();
        await Promise.all(radios.slice(1).map((radio) => expect(radio).toBeDisabled()));
    },
};

/** ORISO rule: superadmin-only settings are visible-but-disabled for everyone else. */
export const DisabledForNonSuperadmins: Story = {
    args: { disabled: true },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('radio', { name: 'Bisherige Berater:in einmal informieren' })).toBeDisabled();
        await expect(canvas.queryByRole('button', { name: /edit|bearbeiten/i })).toBeNull();
    },
};

/** As it sits on the page, beside a taller tile, so the free space shows. */
export const InTheRaster: Story = {
    parameters: { tileWidth: 'none' },
    render: (args) => (
        <CardGrid raster>
            <CardGrid.Item>
                <TopicDuplicateSettingsCard {...args} />
            </CardGrid.Item>
            <CardGrid.Item>
                <div style={{ height: 720 }} />
            </CardGrid.Item>
        </CardGrid>
    ),
};

/** The explanation behind the info button, one slide after the other. */
export const HelpSlideshow: Story = {
    ...InTheRaster,
    play: async ({ canvasElement }) => walkThroughTileHelp(canvasElement, 3),
};

/**
 * Only the first slide has a drawing. The picture box keeps its height on every step (the tile
 * icon stands in), so Weiter does not jump while clicking through; the header shows the tile icon.
 */
export const HelpKeepsItsGeometry: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(canvas.getByRole('button', { name: /erklärung öffnen|open explanation/i }));
        const dialog = await body.findByRole('dialog');
        await expect(dialog.querySelector('[data-tile-help-icon] svg')).not.toBeNull();

        // Layout sizes, not getBoundingClientRect: the dialog's zoom-in animation
        // scales the box (0.2 → 1) and would make the first frames look smaller.
        const offsetTopWithin = (element: HTMLElement) => {
            let top = 0;
            let node: HTMLElement | null = element;
            while (node && node !== dialog) {
                top += node.offsetTop;
                node = node.offsetParent as HTMLElement | null;
            }
            return top;
        };
        const measure = () => ({
            media: (dialog.querySelector('[data-tile-help-media]') as HTMLElement).offsetHeight,
            next: offsetTopWithin(
                within(dialog).getByRole('button', { name: /^(weiter|next|fertig|done)$/i }) as HTMLElement,
            ),
        });
        const first = measure();
        await expect(dialog.querySelector('[data-tile-help-media="visual"] img')).not.toBeNull();
        for (let step = 2; step <= 3; step += 1) {
            // eslint-disable-next-line no-await-in-loop -- the slides follow one another.
            await userEvent.click(within(dialog).getByRole('button', { name: /^(weiter|next)$/i }));
            // eslint-disable-next-line no-await-in-loop
            await expect(
                dialog.querySelector('[data-tile-help-media="placeholder"] [data-tile-help-placeholder] svg'),
            ).not.toBeNull();
            const current = measure();
            // eslint-disable-next-line no-await-in-loop
            await expect(current.media).toBe(first.media);
            // eslint-disable-next-line no-await-in-loop
            await expect(Math.abs(current.next - first.next)).toBeLessThan(1);
        }
    },
};

/** The stylesheet rules that apply under „Bewegung reduzieren“ to elements with this class. */
const reducedMotionRules = (doc: Document, className: string) =>
    Array.from(doc.styleSheets).flatMap((sheet) => {
        let rules: CSSRule[] = [];
        try {
            rules = Array.from(sheet.cssRules);
        } catch {
            return [];
        }
        return rules
            .filter(
                (rule): rule is CSSMediaRule =>
                    rule instanceof CSSMediaRule && /prefers-reduced-motion:\s*reduce/.test(rule.media.mediaText),
            )
            .flatMap((rule) => Array.from(rule.cssRules))
            .filter(
                (rule): rule is CSSStyleRule =>
                    rule instanceof CSSStyleRule && rule.selectorText.includes(`.${className}`),
            );
    });

/**
 * The red band of the Tutorial canvas: a thin primary line at the foot of the picture box grows
 * when a step appears, pulls back a little and settles — one back-and-forth, every pass under
 * 480ms. Each step starts it again. It never covers the drawing, and under „Bewegung reduzieren“
 * it does not move: it is simply there.
 */
export const HelpRedBand: Story = {
    ...InTheRaster,
    play: async ({ canvasElement, step }) => {
        const canvas = within(canvasElement);
        const doc = canvasElement.ownerDocument;
        const body = within(doc.body);
        await userEvent.click(canvas.getByRole('button', { name: /erklärung öffnen|open explanation/i }));
        const dialog = await body.findByRole('dialog');
        const band = () => dialog.querySelector<HTMLElement>('[data-tile-help-media] [data-tile-help-band]');
        const first = band();
        const reduced = doc.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches ?? false;

        await step('the band sits in the picture box, in the primary colour, below the drawing', async () => {
            await expect(first).not.toBeNull();
            const style = getComputedStyle(first!);
            // The colour comes from the token, not a fixed red.
            const probe = doc.createElement('span');
            probe.style.color = 'var(--m3-primary, #a5000a)';
            dialog.appendChild(probe);
            const primary = getComputedStyle(probe).color;
            probe.remove();
            await expect(style.backgroundColor).toBe(primary);
            await expect(parseFloat(style.height)).toBeLessThanOrEqual(3);
            if (!reduced) {
                await expect(style.animationName).not.toBe('none');
                await expect(parseFloat(style.animationDuration)).toBeLessThanOrEqual(0.96);
                await expect(style.animationIterationCount).toBe('1');
            }
            // Either way it ends at full width, under the picture (same zoom for both boxes).
            await waitFor(() => expect(new DOMMatrix(getComputedStyle(first!).transform).a).toBe(1), {
                timeout: 3000,
            });
            const picture = dialog.querySelector('[data-tile-help-media="visual"] img') as HTMLElement;
            await expect(first!.getBoundingClientRect().top).toBeGreaterThanOrEqual(
                picture.getBoundingClientRect().bottom - 0.5,
            );
        });

        await step('„Bewegung reduzieren“ stops it', async () => {
            const className = Array.from(first!.classList).find((name) => /band/.test(name));
            await expect(className).toBeDefined();
            const rules = reducedMotionRules(doc, className!);
            await expect(rules.length).toBeGreaterThan(0);
            await expect(rules.some((rule) => rule.style.animationName === 'none')).toBe(true);
            if (reduced) {
                await expect(getComputedStyle(first!).animationName).toBe('none');
            }
        });

        await step('the next step starts it again', async () => {
            await userEvent.click(within(dialog).getByRole('button', { name: /^(weiter|next)$/i }));
            await waitFor(() => expect(band()).not.toBe(first));
            await expect(band()).not.toBeNull();
        });
    },
};
