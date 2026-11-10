import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, waitFor, within } from 'storybook/test';
import { applyAdminInvertedTheme } from '../../utils/applyAdminTheme';
import { contrastRatio } from '../../utils/contrastRatio';
import { Snackbar, SnackbarCloseButton, SnackbarTextButton, type SnackbarProps } from './Snackbar';
import { SnackbarProvider, useSnackbar } from './useSnackbar';
import { createSnackbarStore } from './snackbarStore';

const FIGMA = 'https://www.figma.com/design/RTUi1rcrEWECXz8rNFmj7Q/Design-System-M3_ORISO?node-id=53977-33575';

const meta = {
    title: 'Molecules/Snackbar',
    component: Snackbar,
    parameters: {
        // These stories bring their own (contained) host.
        ownSnackbarHost: true,
        layout: 'padded',
        design: { type: 'figma', url: FIGMA },
        docs: {
            description: {
                component:
                    'M3 snackbar from the ORISO Figma (Design-System-M3_ORISO, node 53977:33575): ten variants plus the action and close building blocks. ' +
                    'Application code never renders it directly. It raises messages through `snackbar.notify()` / `useSnackbar()`, and `<SnackbarHost>` shows up to four at once and queues the rest.',
            },
        },
    },
    args: { message: 'Single-line snackbar' },
} satisfies Meta<typeof Snackbar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figma frames are 344px wide; the stories show them at that width so heights can be compared. */
const FigmaWidth = ({ children }: { children: ReactNode }) => <div style={{ width: 344 }}>{children}</div>;

const noop = () => undefined;
const action = { label: 'Action', onClick: noop };
const longAction = { label: 'Longer Action', onClick: noop };
const two = (first: string, second: string) => (
    <>
        {first}
        <br />
        {second}
    </>
);

interface Variant {
    id: string;
    figma: string;
    label: string;
    props: SnackbarProps;
}

/** The ten examples of the Figma "Snackbar" page, in its order (left column, then right column). */
const FIGMA_VARIANTS: Variant[] = [
    { id: 'single', figma: '53977:34289', label: 'Single-line', props: { message: 'Single-line snackbar' } },
    {
        id: 'single-close',
        figma: '53977:34288',
        label: 'Single-line with close',
        props: { message: 'Single-line snackbar with close', dismissible: true },
    },
    {
        id: 'single-action',
        figma: '53977:34287',
        label: 'Single-line with action',
        props: { message: 'Single-line snackbar with action', action },
    },
    {
        id: 'single-action-close',
        figma: '53977:34286',
        label: 'Single-line with action and close',
        props: { message: 'Single-line snackbar with', action, dismissible: true },
    },
    {
        id: 'two',
        figma: '53977:34285',
        label: 'Two-line without action',
        props: { message: two('Two-line snackbar', 'without action') },
    },
    {
        id: 'two-close',
        figma: '53977:34284',
        label: 'Two-line with close',
        props: { message: two('Two-line snackbar with', 'close affordance'), dismissible: true },
    },
    {
        id: 'two-action',
        figma: '53977:34283',
        label: 'Two-line with action',
        props: { message: two('Two-line snackbar', 'with action'), action },
    },
    {
        id: 'two-action-close',
        figma: '53977:34282',
        label: 'Two-line with action and close',
        props: { message: two('Two-line snackbar with', 'action and close affordance'), action, dismissible: true },
    },
    {
        id: 'two-longer-action',
        figma: '53977:34281',
        label: 'Two-line with longer action',
        props: { message: two('Two-line snackbar with', 'longer action'), action: longAction },
    },
    {
        id: 'two-longer-action-close',
        figma: '53977:34280',
        label: 'Two-line with longer action and close',
        props: {
            message: two('Two-line snackbar with longer', 'action and close affordance'),
            action: longAction,
            dismissible: true,
        },
    },
];

const caption: CSSProperties = { margin: '0 0 6px', font: '400 12px/16px var(--m3-body-font-family)', opacity: 0.7 };

const VariantGrid = ({ tone }: { tone?: SnackbarProps['severity'] }) => (
    <div
        style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(344px, 344px))',
            gap: '24px 24px',
        }}
    >
        {FIGMA_VARIANTS.map((variant) => (
            <div key={variant.id} data-variant={variant.id}>
                <p style={caption}>
                    {variant.label} · {variant.figma}
                </p>
                <FigmaWidth>
                    <Snackbar {...variant.props} severity={tone} onClose={noop} />
                </FigmaWidth>
            </div>
        ))}
    </div>
);

/** All ten Figma variants. Compare heights with Figma: 48 / 68 / 112 px. */
export const AllVariants: Story = {
    render: () => <VariantGrid />,
    play: async ({ canvasElement }) => {
        const heights = Object.fromEntries(
            FIGMA_VARIANTS.map((variant) => [
                variant.id,
                Math.round(
                    canvasElement
                        .querySelector(`[data-variant="${variant.id}"] [data-testid="snackbar"]`)
                        ?.getBoundingClientRect().height ?? 0,
                ),
            ]),
        );
        // Figma node heights: single 48, two lines 68, longer action 112.
        await expect(heights).toEqual({
            single: 48,
            'single-close': 48,
            'single-action': 48,
            'single-action-close': 48,
            two: 68,
            'two-close': 68,
            'two-action': 68,
            'two-action-close': 68,
            'two-longer-action': 112,
            'two-longer-action-close': 112,
        });
    },
};

const variantStory = (id: string): Story => {
    const variant = FIGMA_VARIANTS.find((candidate) => candidate.id === id) as Variant;
    return {
        name: variant.label,
        args: variant.props,
        parameters: { design: { type: 'figma', url: FIGMA.replace('53977-33575', variant.figma.replace(':', '-')) } },
        render: (args) => (
            <FigmaWidth>
                <Snackbar {...args} onClose={noop} />
            </FigmaWidth>
        ),
    };
};

export const SingleLine = variantStory('single');
export const SingleLineWithClose = variantStory('single-close');
export const SingleLineWithAction = variantStory('single-action');
export const SingleLineWithActionAndClose = variantStory('single-action-close');
export const TwoLine = variantStory('two');
export const TwoLineWithClose = variantStory('two-close');
export const TwoLineWithAction = variantStory('two-action');
export const TwoLineWithActionAndClose = variantStory('two-action-close');
export const TwoLineWithLongerAction = variantStory('two-longer-action');
export const TwoLineWithLongerActionAndClose = variantStory('two-longer-action-close');

/** Figma "Building blocks": the text action and the close affordance in all four interaction states. */
export const BuildingBlocks: Story = {
    render: () => {
        const states = ['enabled', 'hovered', 'focused', 'pressed'] as const;
        const panel: CSSProperties = {
            display: 'flex',
            gap: 24,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            background: 'var(--m3-inverse-surface)',
            color: 'var(--m3-inverse-on-surface)',
            borderRadius: 4,
            width: 'fit-content',
        };
        return (
            <div style={{ display: 'grid', gap: 16 }}>
                <div style={panel} data-testid="blocks-action">
                    {states.map((state) => (
                        <span key={state} style={{ color: 'var(--m3-inverse-primary)' }}>
                            <SnackbarTextButton state={state}>Label</SnackbarTextButton>
                        </span>
                    ))}
                </div>
                <div style={panel} data-testid="blocks-close">
                    {states.map((state) => (
                        <SnackbarCloseButton key={state} state={state} label="Close" />
                    ))}
                </div>
            </div>
        );
    },
};

/** The four tones. Neutral is the Figma snackbar; the others reuse its shell for their meaning. */
export const Tones: Story = {
    render: () => (
        <div style={{ display: 'grid', gap: 16, width: 344 }}>
            <Snackbar message="Neutral: a hint" severity="info" />
            <Snackbar message="Success: changes saved" severity="success" />
            <Snackbar message="Warning: setup mail not sent" severity="warning" action={action} dismissible />
            <Snackbar message="Error: could not save" severity="error" dismissible />
        </div>
    ),
};

/** Longest German copy the Admin shows today, wrapped inside the 344px frame and at full width. */
const LONG_DE =
    'Die Zugangsdaten konnten nicht gesendet werden, weil der E-Mail-Server der Beratungsstelle die Verbindung abgelehnt hat. Bitte prüfen Sie die Einstellungen unter „E-Mail-Server“ und versuchen Sie es erneut.';

export const LongestGermanText: Story = {
    parameters: { viewport: { defaultViewport: 'phone' } },
    render: () => (
        <div style={{ display: 'grid', gap: 16, maxWidth: 672 }}>
            <Snackbar message={LONG_DE} severity="error" dismissible />
            <Snackbar
                message={LONG_DE}
                severity="error"
                dismissible
                action={{ label: 'Erneut versuchen', onClick: noop }}
            />
            <Snackbar
                message={LONG_DE}
                action={{ label: 'Rückgängig', onClick: noop }}
                dismissible
                description="Das war der dritte Versuch."
            />
        </div>
    ),
};

/** Dark scheme: the inverse roles flip, so the snackbar turns light on the dark surface (M3). */
const DarkFrame = () => {
    const ref = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        if (ref.current) applyAdminInvertedTheme({ primaryColor: '#A5000A' }, ref.current);
    }, []);
    return (
        <div
            ref={ref}
            style={{ background: 'var(--m3-surface)', padding: 24, borderRadius: 8, color: 'var(--m3-on-surface)' }}
        >
            <p style={caption}>Dark scheme (inverted tokens on this frame only)</p>
            <div style={{ display: 'grid', gap: 16, width: 344 }}>
                <Snackbar message="Single-line snackbar with action" action={action} dismissible />
                <Snackbar message="Success: changes saved" severity="success" />
                <Snackbar message="Error: could not save" severity="error" dismissible />
            </div>
        </div>
    );
};

export const DarkScheme: Story = { render: () => <DarkFrame /> };

/* ---------------------------------------------------------------- focus ring */

const TONES_WITH_CONTROLS = (['info', 'success', 'warning', 'error'] as const).map((severity) => (
    <Snackbar key={severity} message={`${severity}: keyboard focus`} severity={severity} action={action} dismissible />
));

const rgbToHex = (rgb: string): string => {
    const [r, g, b] = (rgb.match(/\d+(\.\d+)?/g) ?? ['0', '0', '0'])
        .slice(0, 3)
        .map((part) => Math.round(Number(part)));
    return `#${[r, g, b].map((part) => part.toString(16).padStart(2, '0')).join('')}`;
};

const FocusRingFrames = () => {
    const dark = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        if (dark.current) applyAdminInvertedTheme({ primaryColor: '#A5000A' }, dark.current);
    }, []);
    return (
        <div style={{ display: 'grid', gap: 24, width: 344 }}>
            <div style={{ display: 'grid', gap: 16 }}>{TONES_WITH_CONTROLS}</div>
            <div
                ref={dark}
                style={{ display: 'grid', gap: 16, padding: 16, background: 'var(--m3-surface)', borderRadius: 8 }}
            >
                {TONES_WITH_CONTROLS}
            </div>
        </div>
    );
};

/**
 * The focus ring of the action and the close button, in every tone and in both schemes, measured on
 * the real rendering: a 3px ring that is at least 3:1 against the snackbar behind it (WCAG 1.4.11).
 * axe does not look at the focus state, so this story does.
 */
export const FocusRing: Story = {
    render: () => <FocusRingFrames />,
    play: async ({ canvasElement, userEvent }) => {
        const buttons = within(canvasElement).getAllByRole('button');
        await expect(buttons).toHaveLength(16);
        for (let index = 0; index < buttons.length; index += 1) {
            const button = buttons[index];
            // eslint-disable-next-line no-await-in-loop -- keyboard focus moves one stop at a time
            await userEvent.tab();
            // eslint-disable-next-line no-await-in-loop
            await expect(button).toHaveFocus();
            const ring = getComputedStyle(button);
            const container = getComputedStyle(button.closest('[data-severity]') as HTMLElement);
            // eslint-disable-next-line no-await-in-loop
            await expect(ring.outlineWidth).toBe('3px');
            // eslint-disable-next-line no-await-in-loop
            await expect(
                contrastRatio(rgbToHex(ring.outlineColor), rgbToHex(container.backgroundColor)),
            ).toBeGreaterThanOrEqual(3);
        }
    },
};

/* ---------------------------------------------------------------- channel demo */

const ChannelButtons = ({ frameRef }: { frameRef: (element: HTMLDivElement | null) => void }) => {
    const { notify, error, success, clear } = useSnackbar();
    const button: CSSProperties = { padding: '8px 12px', margin: '0 8px 8px 0', cursor: 'pointer' };
    return (
        <div
            ref={frameRef}
            style={{
                position: 'relative',
                minHeight: 380,
                padding: 16,
                background: 'var(--m3-surface-container-high)',
                borderRadius: 8,
            }}
        >
            <p style={{ margin: '0 0 12px' }}>
                Up to four stack at the corner, the rest wait. Identical messages collapse into one. Success times out
                after 4 to 6 s; errors, warnings and actions stay until closed.
            </p>
            <button
                type="button"
                style={button}
                onClick={() => error('Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später noch einmal.')}
            >
                Error (stays until closed)
            </button>
            <button
                type="button"
                style={button}
                onClick={() => {
                    for (let i = 0; i < 5; i += 1)
                        error('Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später noch einmal.');
                }}
            >
                Burst of 5 identical errors
            </button>
            <button type="button" style={button} onClick={() => success('Gespeichert.')}>
                Success
            </button>
            <button
                type="button"
                style={button}
                onClick={() => {
                    success('Erste Meldung');
                    success('Zweite Meldung');
                    success('Dritte Meldung');
                }}
            >
                Stack of three
            </button>
            <button
                type="button"
                style={button}
                onClick={() =>
                    notify({
                        message: 'Entwurf verworfen.',
                        action: { label: 'Rückgängig', onClick: noop },
                        severity: 'success',
                    })
                }
            >
                Success with action (stays)
            </button>
            <button type="button" style={button} onClick={clear}>
                Clear
            </button>
        </div>
    );
};

// The Storybook preview mounts its own host, whose assertive region is always in the DOM and empty.
// Pick the region that holds a pop-up of this story instead of the first alert in the page.
const snackbarAlert = (body: ReturnType<typeof within>): HTMLElement => {
    const region = body.getAllByRole('alert').find((el) => el.querySelector('[data-testid="snackbar"]'));
    if (!region) throw new Error('No assertive region holds a snackbar yet');
    return region;
};

const ChannelDemo = () => {
    const store = useMemo(() => createSnackbarStore(), []);
    const [frame, setFrame] = useState<HTMLDivElement | null>(null);
    return (
        <SnackbarProvider store={store} container={frame} contained>
            <ChannelButtons frameRef={setFrame} />
        </SnackbarProvider>
    );
};

/** Queue and de-duplication: the burst of identical errors leaves exactly one snackbar. */
export const ChannelQueueAndDedupe: Story = {
    render: () => <ChannelDemo />,
    play: async ({ canvasElement, userEvent }) => {
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(within(canvasElement).getByRole('button', { name: 'Burst of 5 identical errors' }));
        await waitFor(() => expect(body.getAllByTestId('snackbar')).toHaveLength(1));
        await userEvent.click(within(canvasElement).getByRole('button', { name: 'Burst of 5 identical errors' }));
        await expect(body.getAllByTestId('snackbar')).toHaveLength(1);
        await expect(snackbarAlert(body)).toHaveTextContent('Es ist ein Fehler aufgetreten.');
    },
};

/** An error is announced by an assertive live region and carries the close affordance. */
export const ErrorIsAnAlert: Story = {
    render: () => <ChannelDemo />,
    play: async ({ canvasElement, userEvent }) => {
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(within(canvasElement).getByRole('button', { name: 'Error (stays until closed)' }));
        const alert = await waitFor(() => snackbarAlert(body));
        // The pop-up fades in over 150 ms; an element at opacity 0 is not visible yet.
        await waitFor(() => expect(within(alert).getByRole('button', { name: 'Meldung schließen' })).toBeVisible());
        await userEvent.click(within(alert).getByRole('button', { name: 'Meldung schließen' }));
        await waitFor(() => expect(body.queryByTestId('snackbar')).toBeNull());
    },
};

const CARD: CSSProperties = {
    minHeight: 150,
    padding: 16,
    background: 'var(--m3-surface)',
    border: '1px solid var(--m3-outline-variant)',
    borderRadius: 12,
};

const TILES = ['Statistik', 'Rechtliches', 'Einladungen'];

const TileButtons = ({ title, cause }: { title: string; cause?: string }) => {
    const { error, success, notify } = useSnackbar();
    const button: CSSProperties = { padding: '6px 10px', margin: '0 8px 8px 0', cursor: 'pointer' };
    return (
        <>
            <h4 style={{ margin: '0 0 8px' }}>{title}</h4>
            <p style={{ margin: '0 0 12px' }}>The pop-ups stack at the screen corner, never in here.</p>
            <button
                type="button"
                style={button}
                onClick={() =>
                    error({
                        title: `${title} lädt nicht`,
                        description: 'Daten konnten nicht geladen werden.',
                        causeKey: cause,
                    })
                }
            >
                Load fails
            </button>
            <button type="button" style={button} onClick={() => success({ title: `${title} gespeichert` })}>
                Save
            </button>
            <button
                type="button"
                style={button}
                onClick={() =>
                    notify({
                        title: `${title}: Eintrag fehlt`,
                        description: 'Bitte ergänzen Sie den Text.',
                        severity: 'warning',
                        jump: { target: `card-${title}` },
                    })
                }
            >
                Entry missing
            </button>
        </>
    );
};

const TilesDemo = ({ sharedCause }: { sharedCause?: string }) => {
    const store = useMemo(() => createSnackbarStore(), []);
    const [frame, setFrame] = useState<HTMLDivElement | null>(null);
    return (
        <SnackbarProvider store={store} container={frame} contained>
            <div
                ref={setFrame}
                style={{
                    position: 'relative',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: 16,
                    padding: 16,
                    minHeight: 560,
                    background: 'var(--m3-surface-container-high)',
                    borderRadius: 8,
                }}
            >
                {TILES.map((title) => (
                    <section key={title} id={`card-${title}`} tabIndex={-1} style={CARD}>
                        <TileButtons title={title} cause={sharedCause} />
                    </section>
                ))}
            </div>
        </SnackbarProvider>
    );
};

/**
 * Event notifications are a classic toast stack at the bottom right of the screen (phones: along
 * the bottom): newest nearest the corner, a gap between them, a title, a close button on each.
 * They overlay the page; the cards do not move.
 */
export const StackOfThree: Story = {
    render: () => <TilesDemo />,
    play: async ({ canvasElement, userEvent }) => {
        const [first, second, third] = TILES.map(
            (title) => canvasElement.querySelector(`#card-${title}`) as HTMLElement,
        );
        const heightBefore = first.getBoundingClientRect().height;
        await userEvent.click(within(first).getByRole('button', { name: 'Load fails' }));
        await userEvent.click(within(second).getByRole('button', { name: 'Entry missing' }));
        await userEvent.click(within(third).getByRole('button', { name: 'Load fails' }));
        await waitFor(() => expect(canvasElement.querySelectorAll('[data-testid="snackbar"]')).toHaveLength(3));
        await expect(first.getBoundingClientRect().height).toBe(heightBefore);
        // DOM order is not stacking order (errors live in their own region), so sort by position.
        const boxes = Array.from(canvasElement.querySelectorAll('[data-testid="snackbar"]'))
            .map((node) => node.getBoundingClientRect())
            .sort((a, b) => a.top - b.top);
        // Stacked: each one lies fully below the previous one, with a gap.
        await expect(boxes[1].top).toBeGreaterThan(boxes[0].bottom);
        await expect(boxes[2].top).toBeGreaterThan(boxes[1].bottom);
    },
};

/**
 * "Ansehen": the pop-up belongs to a card. The jump scrolls to it and focuses it (here the card;
 * with an editor `onJump` opens or enlarges it first), the pop-up stays.
 */
export const JumpAction: Story = {
    render: () => <TilesDemo />,
    play: async ({ canvasElement, userEvent }) => {
        const card = canvasElement.querySelector('#card-Rechtliches') as HTMLElement;
        await userEvent.click(within(card).getByRole('button', { name: 'Entry missing' }));
        const popup = await within(canvasElement).findByTestId('snackbar');
        await userEvent.click(within(popup).getByRole('button', { name: /Ansehen|View/ }));
        // The card's heading takes the focus. The pop-up stays.
        await waitFor(() => expect(within(card).getByRole('heading')).toHaveFocus());
        await expect(canvasElement.querySelector('[data-testid="snackbar"]')).not.toBeNull();
    },
};

/** An error does not time out. It stays until it is closed, whether or not it has an action. */
export const ErrorThatStays: Story = {
    render: () => <ChannelDemo />,
    play: async ({ canvasElement, userEvent }) => {
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(within(canvasElement).getByRole('button', { name: 'Error (stays until closed)' }));
        const alert = await waitFor(() => snackbarAlert(body));
        // The pop-up fades in over 150 ms; an element at opacity 0 is not visible yet.
        await waitFor(() => expect(within(alert).getByRole('button', { name: 'Meldung schließen' })).toBeVisible());
    },
};

/** One backend outage that fails three cards: one pop-up, not three. */
export const CauseKeyBurst: Story = {
    render: () => <TilesDemo sharedCause="tenant-api-down" />,
    play: async ({ canvasElement, userEvent }) => {
        const buttons = within(canvasElement).getAllByRole('button', { name: 'Load fails' });
        // eslint-disable-next-line no-restricted-syntax, no-await-in-loop -- clicks must happen in order
        for (const button of buttons) await userEvent.click(button);
        await waitFor(() => expect(canvasElement.querySelectorAll('[data-testid="snackbar"]')).toHaveLength(1));
    },
};

/**
 * The same four tones in both schemes, measured on the real rendering: message text and action text
 * are at least 4.5:1 against their snackbar. The warning tone with an action in the dark frame is the
 * pair that once came out at 1.06:1.
 */
export const ToneContrast: Story = {
    render: () => <FocusRingFrames />,
    play: async ({ canvasElement }) => {
        const popups = within(canvasElement).getAllByTestId('snackbar');
        await expect(popups).toHaveLength(8);
        const ratios = popups.flatMap((popup) => {
            const background = rgbToHex(getComputedStyle(popup).backgroundColor);
            const actionButton = popup.querySelector('button:not([aria-label])') as HTMLElement;
            return [popup, actionButton].map((element) =>
                contrastRatio(rgbToHex(getComputedStyle(element).color), background),
            );
        });
        await expect(Math.min(...ratios)).toBeGreaterThanOrEqual(4.5);
    },
};
