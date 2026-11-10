import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { ThemeEditorModal } from './index';

/** Stub origin — stories must never fall back to configured `appURL`. */
const STUB_APP_BASE_URL = 'https://theme-preview.test';

/**
 * Full-screen Farben editor with all three seed pickers (dark accent, light
 * accent, error/signal). Alert/warning row intentionally absent (#905).
 * Preset circles under the dark accent and a purpose line per colour (#1374).
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

const PRESET_NAME = {
    caritasRed: /^(Caritas-Rot|Caritas red)$/,
    blue: /^(Blau|Blue)$/,
    violet: /^(Violett|Violet)$/,
};

const SIGNAL_TOO_CLOSE = /(liegt sehr nah an der Markenfarbe|very close to the brand colour)/;

/** Body of the open modal: antd renders it in a portal outside the story root. */
const modalBody = (canvasElement: HTMLElement) => within(canvasElement.ownerDocument.body);

/** Untouched Caritas colours: Caritas-Rot is the selected circle and nothing warns. */
export const CaritasDefaults: Story = {
    play: async ({ canvasElement }) => {
        const body = modalBody(canvasElement);
        const caritasRed = await body.findByRole('radio', { name: PRESET_NAME.caritasRed });

        await expect(caritasRed).toBeChecked();
        await expect(body.getByTestId('preset-status')).toHaveTextContent('#A5000A');
        // The modal zooms in: wait until its text is drawn before checking visibility.
        await waitFor(() =>
            expect(
                body.getByText(/^(Aktive Aktionen und markante Akzente|Active actions and prominent accents)$/),
            ).toBeVisible(),
        );
        await expect(
            body.getByText(/^(Helle Flächen, Chips und Umrandungen|Light surfaces, chips and borders)$/),
        ).toBeVisible();
        await expect(body.getByText(/^(Fehler und Abbrüche|Errors and cancellations)$/)).toBeVisible();
        await expect(body.queryByText(SIGNAL_TOO_CLOSE)).not.toBeInTheDocument();
    },
};

/** A stored preset colour shows as the selected circle; tapping another one takes it over. */
export const PresetSelected: Story = {
    args: {
        initialValues: { theming: { primaryColor: '#00639b', accent: '#d6e6ef', signal: '#b1005e' } },
        storedSeeds: { accentDark: '#00639b', accentLight: '#d6e6ef', signal: '#b1005e' },
    },
    play: async ({ canvasElement }) => {
        const body = modalBody(canvasElement);

        await expect(await body.findByRole('radio', { name: PRESET_NAME.blue })).toBeChecked();
        await expect(body.getByTestId('preset-status')).toHaveTextContent(/^(Blau|Blue) · #00639B$/);

        await userEvent.click(body.getByRole('radio', { name: PRESET_NAME.violet }));
        await waitFor(() => expect(body.getByRole('heading', { name: 'HEX #6B4FA0' })).toBeVisible());
        await expect(body.getByRole('radio', { name: PRESET_NAME.violet })).toBeChecked();
    },
};

/** An own colour from the colour field: no circle is selected, the line says „Eigene Farbe“. */
export const CustomColour: Story = {
    args: {
        initialValues: { theming: { primaryColor: '#8c2f39', accent: '#ffe2de', signal: '#b1005e' } },
        storedSeeds: { accentDark: '#8c2f39', accentLight: '#ffe2de', signal: '#b1005e' },
    },
    play: async ({ canvasElement }) => {
        const body = modalBody(canvasElement);
        const radios = await body.findAllByRole('radio');

        radios.forEach((radio) => expect(radio).not.toBeChecked());
        await expect(body.getByTestId('preset-status')).toHaveTextContent(/^(Eigene Farbe|Custom colour) · #8C2F39$/);
        await waitFor(() => expect(body.getByRole('heading', { name: 'HEX #8C2F39' })).toBeVisible());
    },
};

/** A grey error colour fails 4.5 : 1 against the text on it: badge and notice say so. */
export const WeakContrastWarning: Story = {
    args: {
        initialValues: { theming: { primaryColor: '#a5000a', accent: '#ffe2de', signal: '#808080' } },
        storedSeeds: { accentDark: '#a5000a', accentLight: '#ffe2de', signal: '#808080' },
    },
    play: async ({ canvasElement }) => {
        const body = modalBody(canvasElement);
        // The app-wide snackbar region is a (still empty) status too; the notice is the one with text.
        await waitFor(() => expect(body.getAllByRole('status').find((node) => node.textContent?.trim())).toBeVisible());
        // A grey error colour is weak, but not "close to the brand": only the contrast notice shows.
        await expect(body.queryByText(SIGNAL_TOO_CLOSE)).not.toBeInTheDocument();
        await expect(canvasElement.ownerDocument.querySelector('[data-contrast-level="fail"]')).not.toBeNull();
    },
};

export const LockedSeeds: Story = {
    args: {
        locks: { accentDark: true, accentLight: true, signal: true },
    },
    play: async ({ canvasElement }) => {
        const radios = await modalBody(canvasElement).findAllByRole('radio');

        radios.forEach((radio) => expect(radio).toBeDisabled());
    },
};

/** Phone width: the circles wrap under the field and stay tappable. */
export const Phone390: Story = {
    globals: { viewport: { value: 'phone390', isRotated: false } },
    parameters: {
        viewport: {
            options: {
                phone390: { name: 'Phone 390', styles: { width: '390px', height: '844px' }, type: 'mobile' },
            },
        },
    },
    play: async ({ canvasElement }) => {
        const body = modalBody(canvasElement);
        const group = await body.findByRole('radiogroup');

        await expect(group.scrollWidth).toBeLessThanOrEqual(group.clientWidth);
        await userEvent.click(body.getByRole('radio', { name: PRESET_NAME.blue }));
        await waitFor(() => expect(body.getByRole('heading', { name: 'HEX #00639B' })).toBeVisible());
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
    play: async ({ canvasElement }) => {
        await waitFor(() => expect(modalBody(canvasElement).getByText(SIGNAL_TOO_CLOSE)).toBeVisible());
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

/**
 * Regression for #906: inside the former 1101–1250 overflow band the preview
 * panel must fit without horizontal scroll (scrollWidth ≤ clientWidth).
 */
export const PreviewFitsOverflowBand: Story = {
    globals: { viewport: { value: 'overflowBand1200', isRotated: false } },
    parameters: {
        viewport: {
            options: {
                overflowBand1200: {
                    name: 'Overflow band 1200',
                    styles: { width: '1200px', height: '800px' },
                },
            },
        },
    },
    play: async ({ canvasElement }) => {
        const doc = canvasElement.ownerDocument;
        const body = within(doc.body);
        const panel = await body.findByRole('region', { name: /^(Colors|Farben)$/ });

        expect(panel.scrollWidth).toBeLessThanOrEqual(panel.clientWidth);
    },
};
