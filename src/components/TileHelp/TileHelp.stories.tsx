import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export.
import { expect, userEvent, within } from 'storybook/test';
import { ConfigProvider } from 'antd';
import { useLayoutEffect, type ReactNode } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { buildAdminAntdTheme } from '../../theme/antdM3Theme';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import { applyAdminInvertedTheme, applyAdminTheme, clearAdminInvertedThemeTokens } from '../../utils/applyAdminTheme';
import { computeOrisoPalette, PICTURE_FILTER_ON_DARK } from '../../utils/theme/orisoScheme';
import { topicDuplicateHelp } from '../GlobalSettings/TopicDuplicateSettingsCard/help';
import { TileHelpButton } from '.';

const darkTokens = computeOrisoPalette({}, 'inverted').tokens;

/**
 * Writes the workspace tokens for as long as the story is on screen. `dark` builds what a dark
 * workspace would be: the inverted scheme, tiles and dialogs on its dark surfaces, and the picture
 * filter set. The admin has no dark workspace yet (tiles and dialogs stay light in the inverted
 * scheme), so there is nothing to switch to in the app; this is the part that is ready for it.
 */
const Workspace = ({ dark, children }: { dark: boolean; children: ReactNode }) => {
    useLayoutEffect(() => {
        const root = document.documentElement;
        if (dark) {
            applyAdminInvertedTheme(null);
            root.style.setProperty('--admin-form-card-surface', darkTokens['--m3-surface-container-high']);
            root.style.setProperty('--admin-picture-filter', PICTURE_FILTER_ON_DARK);
        } else {
            applyAdminTheme(null);
        }
        return () => clearAdminInvertedThemeTokens();
    }, [dark]);
    return (
        <ConfigProvider theme={buildAdminAntdTheme({ scheme: dark ? 'inverted' : 'light' })}>{children}</ConfigProvider>
    );
};

const meta = {
    title: 'Molecules/TileHelp',
    component: TileHelpButton,
    decorators: [
        (Story) => (
            <ThemeProvider theme={orisoMuiTheme}>
                <Story />
            </ThemeProvider>
        ),
    ],
    args: { topic: topicDuplicateHelp, tileTitle: 'Zwei Beratungen zum gleichen Thema' },
} satisfies Meta<typeof TileHelpButton>;
export default meta;
type Story = StoryObj<typeof meta>;

const openExplanation = async (canvasElement: HTMLElement) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: /erklärung öffnen|open explanation/i }));
    const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog');
    const media = dialog.querySelector<HTMLElement>('[data-tile-help-media="visual"]');
    const picture = media?.querySelector('img');
    const sheet = dialog.matches('.ant-modal-content') ? dialog : dialog.querySelector('.ant-modal-content');
    if (!media || !picture || !sheet) throw new Error('The slide shows no drawing');
    return {
        filter: getComputedStyle(picture).filter,
        pictureBox: getComputedStyle(media).backgroundColor,
        dialogSurface: getComputedStyle(sheet).backgroundColor,
    };
};

/** The drawing as it was made: dark ink on the light picture box. */
export const Light: Story = {
    decorators: [
        (Story) => (
            <Workspace dark={false}>
                <Story />
            </Workspace>
        ),
    ],
    play: async ({ canvasElement }) => {
        const { filter, pictureBox, dialogSurface } = await openExplanation(canvasElement);
        await expect(filter).toBe('none');
        await expect(pictureBox).toBe('rgb(247, 243, 244)');
        await expect(dialogSurface).toBe('rgb(234, 231, 232)');
    },
};

/**
 * The same slide on a dark workspace: the dialog and the picture box are dark and the drawing is
 * flipped light (`--admin-picture-filter`), so the ink does not sink into the surface.
 */
export const DarkWorkspace: Story = {
    decorators: [
        (Story) => (
            <Workspace dark>
                <Story />
            </Workspace>
        ),
    ],
    play: async ({ canvasElement }) => {
        const { filter, pictureBox, dialogSurface } = await openExplanation(canvasElement);
        await expect(filter).toBe(PICTURE_FILTER_ON_DARK);
        await expect(pictureBox).toBe('rgb(56, 54, 55)');
        await expect(dialogSurface).toBe('rgb(71, 69, 69)');
    },
};
