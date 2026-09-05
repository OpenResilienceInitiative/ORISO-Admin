import type { Meta, StoryObj } from '@storybook/react-vite';
import { ThemeEditorModal } from './index';

/**
 * Full-screen Farben editor with all three seed pickers (dark accent, light
 * accent, error/signal). Alert/warning row intentionally absent (#905).
 */
const meta = {
    title: 'Organisms/Tenants/ThemeBuilder',
    component: ThemeEditorModal,
    parameters: { layout: 'fullscreen' },
    args: {
        open: true,
        initialValues: {
            theming: {
                primaryColor: '#a5000a',
                accent: '#ffe2de',
                signal: '#b1005e',
            },
        },
        storedSeeds: {
            accentDark: '#a5000a',
            accentLight: '#ffe2de',
            signal: '#b1005e',
        },
        locks: { accentDark: false, accentLight: false, signal: false },
        onCancel: () => {},
        onSubmit: () => {},
    },
} satisfies Meta<typeof ThemeEditorModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ThreePickers: Story = {};

export const SignalTooCloseWarning: Story = {
    args: {
        initialValues: {
            theming: {
                primaryColor: '#a5000a',
                accent: '#ffe2de',
                signal: '#a6000b',
            },
        },
        storedSeeds: {
            accentDark: '#a5000a',
            accentLight: '#ffe2de',
            signal: '#a6000b',
        },
    },
};
