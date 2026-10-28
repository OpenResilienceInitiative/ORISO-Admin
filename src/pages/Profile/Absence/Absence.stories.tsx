import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { ConfigProvider } from 'antd';
import { buildAdminAntdTheme } from '../../../theme/antdM3Theme';
import { Absence } from './index';

const meta = {
    title: 'Pages/Profile/Absence',
    component: Absence,
    parameters: { layout: 'padded' },
    decorators: [
        (Story) => (
            <ConfigProvider theme={buildAdminAntdTheme()}>
                <div style={{ maxWidth: 520 }}>
                    <Story />
                </div>
            </ConfigProvider>
        ),
    ],
} satisfies Meta<typeof Absence>;

export default meta;

/** Prepared card, shown greyed out with the "coming soon" tag: every control is disabled. */
export const ComingSoon: StoryObj<typeof meta> = {
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('switch')).toBeDisabled();
        await expect(canvas.getByLabelText('Von')).toBeDisabled();
    },
};
