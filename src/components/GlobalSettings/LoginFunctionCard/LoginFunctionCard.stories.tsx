import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export.
import { expect, fn, within } from 'storybook/test';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import { CardGrid } from '../../CardGrid';
import { LoginFunctionCard } from '.';

const meta = {
    title: 'Organisms/GlobalSettings/LoginFunctionCard',
    component: LoginFunctionCard,
    decorators: [
        (Story, { parameters }) => (
            <ThemeProvider theme={orisoMuiTheme}>
                <div style={{ maxWidth: parameters.tileWidth ?? 400 }}>
                    <Story />
                </div>
            </ThemeProvider>
        ),
    ],
    args: { initialValues: { settings: { featureAnonymousChatEnabled: false } }, onSave: fn() },
} satisfies Meta<typeof LoginFunctionCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByRole('switch')).not.toBeChecked();
    },
};

export const On: Story = { args: { initialValues: { settings: { featureAnonymousChatEnabled: true } } } };

export const Loading: Story = { args: { isLoading: true } };

/** As it sits on the page, beside taller tiles. The note stays at the bottom. */
export const InTheRaster: Story = {
    parameters: { tileWidth: 'none' },
    render: (args) => (
        <CardGrid raster>
            <CardGrid.Item>
                <LoginFunctionCard {...args} />
            </CardGrid.Item>
            <CardGrid.Item>
                <div style={{ height: 560 }} />
            </CardGrid.Item>
        </CardGrid>
    ),
};
