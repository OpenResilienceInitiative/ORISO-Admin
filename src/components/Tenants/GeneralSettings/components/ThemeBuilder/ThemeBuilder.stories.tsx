import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, within } from 'storybook/test';
import { ThemeEditorModal } from './index';

/** Stub origin — stories must never fall back to configured `appURL`. */
const STUB_APP_BASE_URL = 'https://theme-preview.test';

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
        appBaseUrl: STUB_APP_BASE_URL,
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

export const ThreePickers: Story = {
    play: async ({ canvasElement }) => {
        const doc = canvasElement.ownerDocument;
        const body = within(doc.body);

        const frames = (await body.findAllByTestId('preview-frame')) as HTMLIFrameElement[];
        expect(frames.length).toBeGreaterThanOrEqual(1);

        frames.forEach((frame) => {
            expect(frame.getAttribute('sandbox')).toBe('allow-scripts allow-same-origin');
            expect(frame.getAttribute('src')).toContain(`${STUB_APP_BASE_URL}/theme-demo?`);
            expect(frame.getAttribute('src')).toContain('themePreviewPrimary=');
            expect(frame.getAttribute('src')).toContain('themePreviewAccent=');
            expect(frame.getAttribute('src')).toContain('themePreviewSignal=');
        });

        expect(body.getAllByTestId('preview-frame-shield').length).toBe(frames.length);
        expect(doc.querySelectorAll('img[aria-hidden="true"]').length).toBeGreaterThanOrEqual(2);
    },
};

export const LockedSeeds: Story = {
    args: {
        locks: { accentDark: true, accentLight: true, signal: true },
    },
};

export const TooPaleWarning: Story = {
    args: {
        initialValues: {
            theming: {
                primaryColor: '#c8c8c8',
                accent: '#ffe2de',
                signal: '#b1005e',
            },
        },
        storedSeeds: {
            accentDark: '#c8c8c8',
            accentLight: '#ffe2de',
            signal: '#b1005e',
        },
    },
};

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

export const EmptyPreview: Story = {
    args: {
        initialValues: {
            theming: {
                accent: '#ffe2de',
                signal: '#b1005e',
            },
        },
        storedSeeds: {
            accentLight: '#ffe2de',
            signal: '#b1005e',
        },
    },
};
