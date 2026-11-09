import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { HintText } from '../HintText';
import { Notify } from './index';

/**
 * Notifications are pop-ups on the shared snackbar channel, never boxes in the page.
 * The story page is a tile with fixed content: the pop-up must appear without moving it.
 */
const meta = {
    title: 'Molecules/Notify',
    component: Notify,
    parameters: { layout: 'padded' },
    args: { children: 'text' },
} satisfies Meta<typeof Notify>;

export default meta;
type Story = StoryObj<typeof meta>;

const Tile = ({ children }: { children?: React.ReactNode }) => (
    <section
        data-testid="tile"
        style={{
            maxWidth: 800,
            padding: 24,
            borderRadius: 24,
            background: 'var(--m3-surface-container, #f0edee)',
            minHeight: 320,
        }}
    >
        <h3 style={{ margin: 0, font: 'inherit', fontSize: 22 }}>Agency data privacy policy</h3>
        <p style={{ margin: '16px 0' }}>Diese Fassung ist derzeit öffentlich.</p>
        {children}
    </section>
);

/** Frank's case: a saved draft and a browser draft. A pop-up with both choices, tile untouched. */
export const TwoDraftsConflict: Story = {
    render: function TwoDraftsRender() {
        const [choice, setChoice] = useState<string>('');
        return (
            <Tile>
                <Notify
                    severity="warning"
                    title="Two drafts found"
                    actions={[
                        { label: 'Use draft from this browser', onClick: () => setChoice('browser') },
                        { label: 'Use saved draft', onClick: () => setChoice('saved') },
                    ]}
                >
                    There is a saved draft and a different one in this browser. Choose a version explicitly; the browser
                    draft is removed only once your choice is saved.
                </Notify>
                <HintText>Choice: {choice || 'none yet'}</HintText>
            </Tile>
        );
    },
    play: async ({ canvasElement }) => {
        const tile = within(canvasElement).getByTestId('tile');
        const before = tile.getBoundingClientRect();
        const popup = await within(document.body).findByTestId('snackbar');
        await waitFor(() => expect(within(popup).getByText('Two drafts found')).toBeInTheDocument());
        // The pop-up floats above the layout: the tile did not move or resize.
        const after = tile.getBoundingClientRect();
        expect(after.top).toBe(before.top);
        expect(after.height).toBe(before.height);
        await waitFor(() => {
            expect(within(popup).getByRole('button', { name: 'Use saved draft' })).toBeVisible();
            expect(within(popup).getByRole('button', { name: 'Use draft from this browser' })).toBeVisible();
            expect(within(popup).getByRole('button', { name: /close|schließen/i })).toBeVisible();
        });
        await userEvent.click(within(popup).getByRole('button', { name: 'Use saved draft' }));
        await waitFor(() => expect(within(canvasElement).getByText('Choice: saved')).toBeInTheDocument());
        await waitFor(() => expect(within(document.body).queryByTestId('snackbar')).toBeNull());
    },
};

/** An error stays until dismissed or acted on. */
export const ErrorWithRetry: Story = {
    render: () => (
        <Tile>
            <Notify severity="error" actions={[{ label: 'Retry', onClick: () => undefined }]}>
                The versions could not be loaded.
            </Notify>
        </Tile>
    ),
    play: async () => {
        const popup = await within(document.body).findByTestId('snackbar');
        await waitFor(() => expect(within(popup).getByRole('button', { name: 'Retry' })).toBeVisible());
        await waitFor(() => expect(within(popup).getByRole('button', { name: /close|schließen/i })).toBeVisible());
    },
};

/** Three events at once: classic toast stack bottom right, each with title, close and "Ansehen". */
export const StackOfThree: Story = {
    render: () => (
        <Tile>
            <Notify severity="error" title="Versionen nicht geladen" retry>
                Die Versionen konnten nicht geladen werden.
            </Notify>
            <Notify severity="warning" title="Zwei Entwürfe gefunden">
                Es gibt einen gespeicherten und einen Browser-Entwurf.
            </Notify>
            <Notify severity="info" title="Hinweis" persistent>
                Die bisherige Fassung bleibt live, bis Sie veröffentlichen.
            </Notify>
        </Tile>
    ),
    play: async () => {
        const body = within(document.body);
        await waitFor(() => expect(body.getAllByTestId('snackbar')).toHaveLength(3));
        expect(body.getAllByRole('button', { name: /Ansehen|snackbar\.jump/ }).length).toBeGreaterThan(0);
    },
};

/** A tile that cannot load: pop-up with Retry, and quiet text inside the tile. */
export const LoadFailureInTile: Story = {
    render: () => (
        <Tile>
            <Notify severity="error" title="Einstellungen nicht geladen" retry quietText="Nicht geladen.">
                Die Einstellungen konnten nicht geladen werden.
            </Notify>
        </Tile>
    ),
    play: async ({ canvasElement }) => {
        await within(document.body).findByTestId('snackbar');
        await waitFor(() => expect(within(canvasElement).getByText('Nicht geladen.')).toBeVisible());
    },
};

/** Success and info are polite status messages and may time out. */
export const SuccessIsStatus: Story = {
    render: () => (
        <Tile>
            <Notify severity="success">Einladung an die Datenschutzbeauftragte gesendet.</Notify>
        </Tile>
    ),
    play: async () => {
        const popup = await within(document.body).findByText('Einladung an die Datenschutzbeauftragte gesendet.');
        await waitFor(() => expect(popup).toBeVisible());
    },
};

/** Two real actions plus "Ansehen" at the narrowest phone width: nothing is clipped, the jump is its own link. */
export const TwoActionsAndJumpAtPhoneWidth: Story = {
    globals: { viewport: { value: 'phoneSmall', isRotated: false } },
    render: () => (
        <Tile>
            <Notify
                severity="warning"
                title="Zwei Entwürfe gefunden"
                actions={[
                    { label: 'Eigene Fassung weiterbearbeiten', onClick: () => undefined },
                    { label: 'Gespeicherte Fassung laden', onClick: () => undefined },
                ]}
            >
                Es gibt einen gespeicherten Entwurf und einen abweichenden Entwurf in diesem Browser.
            </Notify>
        </Tile>
    ),
    play: async () => {
        const popup = await within(document.body).findByTestId('snackbar');
        const buttons = within(popup).getAllByRole('button');
        // Two actions, the jump link and close.
        expect(buttons.length).toBeGreaterThanOrEqual(4);
        buttons.forEach((button) => {
            const rect = button.getBoundingClientRect();
            expect(rect.left).toBeGreaterThanOrEqual(0);
            expect(rect.right).toBeLessThanOrEqual(window.innerWidth);
            const label = button.querySelector('span span') ?? button;
            expect(label.scrollWidth).toBeLessThanOrEqual(button.clientWidth + 1);
        });
    },
};

/** Longest German text at the narrow width: wraps, never overflows. */
export const LongestGermanText: Story = {
    parameters: { viewport: { defaultViewport: 'mobile1' } },
    render: () => (
        <Tile>
            <Notify
                severity="warning"
                title="Zwei Entwürfe gefunden"
                actions={[
                    { label: 'Gespeicherten Entwurf verwenden', onClick: () => undefined },
                    { label: 'Entwurf aus diesem Browser verwenden', onClick: () => undefined },
                ]}
            >
                Es gibt einen gespeicherten Entwurf und einen abweichenden Entwurf in diesem Browser. Wählen Sie
                ausdrücklich eine Fassung; der Browser-Entwurf wird erst entfernt, wenn Ihre Wahl gespeichert ist.
            </Notify>
        </Tile>
    ),
};

/** Permanent explanations are plain text in the tile, not notifications. */
export const PermanentHintIsPlainText: Story = {
    render: () => (
        <Tile>
            <HintText title="Entwurf">
                Der Entwurf ist noch nicht veröffentlicht. Die bisherige Fassung bleibt live.
            </HintText>
        </Tile>
    ),
};
