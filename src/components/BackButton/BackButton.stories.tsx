import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { BackButton, type BackButtonProps } from './index';
import { Row, SchemeScope, type StoryScheme } from './storyFixtures';

type StoryArgs = BackButtonProps & {
    /** Story only: `inverted` is the Admin's dark token set. */
    scheme?: StoryScheme;
};

const LONG_LABEL =
    'Zurück zu Träger-Verwaltung für Beratungsstellen der Diakonie Mitteldeutschland e. V. (Landesverband Sachsen-Anhalt)';
const LONG_CURRENT = 'Beratungsstelle für Eltern, Kinder und Jugendliche der Diakonie Mitteldeutschland e. V.';

const meta = {
    title: 'Molecules/BackButton',
    component: BackButton,
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component:
                    'The way back in a page header. Three looks (tonal round button, text button, breadcrumb), one behaviour: a real link, ' +
                    '40px visual with a 48px hit area, visible focus ring, long labels shorten with a tooltip.',
            },
        },
    },
    argTypes: {
        scheme: { control: 'inline-radio', options: ['light', 'inverted'] },
        variant: { control: 'inline-radio', options: ['tonal', 'text', 'breadcrumb'] },
    },
    args: { label: 'Zurück zu Träger', to: '/admin/tenants', trailLabel: 'Seitenpfad', scheme: 'light' },
    decorators: [
        (Story, context) => (
            <SchemeScope scheme={context.args.scheme} minHeight="100vh">
                <div style={{ padding: 16 }}>
                    <Story />
                </div>
            </SchemeScope>
        ),
    ],
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A — neutral tonal round button (40px visual, 48px hit area) with the target page beside it. */
export const Tonal: Story = {
    args: { variant: 'tonal' },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const link = canvas.getByRole('link', { name: 'Zurück zu Träger' });
        await expect(link).toHaveAttribute('href', '/admin/tenants');
        // Keyboard: one Tab reaches it, and the ring is visible.
        await userEvent.tab();
        await expect(link).toHaveFocus();
        await expect(getComputedStyle(link).outlineStyle).toBe('solid');
        await expect(link.getBoundingClientRect().height).toBeCloseTo(40, 0);
        // 48px hit area around the 40px visual: a point 3px outside the visible edge still lands on the
        // link, one 6px outside does not.
        const box = link.getBoundingClientRect();
        const middle = box.top + box.height / 2;
        await expect(document.elementFromPoint(box.left - 3, middle)).toBe(link);
        await expect(document.elementFromPoint(box.left + 12, box.top - 3)).toBe(link);
        await expect(document.elementFromPoint(box.left - 6, middle)).not.toBe(link);
    },
};

/** B — text button with a leading chevron, the same anatomy as the footer "Zurück" buttons. */
export const Text: Story = { args: { variant: 'text' } };

/** C — breadcrumb: parent link, separator, current page. */
export const Breadcrumb: Story = {
    args: { variant: 'breadcrumb', label: 'Träger', current: 'Beispiel-Mandant' },
};

/** The three looks side by side, to compare them. */
export const Compare: Story = {
    render: (args) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <Row caption="A · Rund, neutral, mit Seitenname">
                <BackButton {...args} variant="tonal" />
            </Row>
            <Row caption="B · Textknopf mit Pfeil">
                <BackButton {...args} variant="text" />
            </Row>
            <Row caption="C · Brotkrumen">
                <BackButton {...args} variant="breadcrumb" label="Träger" current="Beispiel-Mandant" />
            </Row>
        </div>
    ),
};

const LETTER = { tonal: 'A', text: 'B', breadcrumb: 'C' } as const;

const STATES: Array<{ caption: string; className?: string }> = [
    { caption: 'Normal' },
    { caption: 'Hover', className: 'pseudo-hover' },
    { caption: 'Fokus (Tastatur)', className: 'pseudo-focus-visible' },
    { caption: 'Gedrückt', className: 'pseudo-active' },
];

/** Default, hover, keyboard focus and pressed for every look. */
export const States: Story = {
    render: (args) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {(['tonal', 'text', 'breadcrumb'] as const).map((variant) => (
                <div
                    key={variant}
                    style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
                >
                    {STATES.map(({ caption, className }) => (
                        <Row key={caption} caption={`${LETTER[variant]} · ${caption}`}>
                            <BackButton
                                {...args}
                                variant={variant}
                                className={className}
                                label={variant === 'breadcrumb' ? 'Träger' : args.label}
                                current={variant === 'breadcrumb' ? 'Beispiel-Mandant' : undefined}
                            />
                        </Row>
                    ))}
                </div>
            ))}
        </div>
    ),
};

/** A page name that does not fit: the label shortens with an ellipsis, a tooltip shows all of it. */
export const LongGermanTitle: Story = {
    args: { label: LONG_LABEL },
    render: (args) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 420 }}>
            <Row caption="A · lange Bezeichnung">
                <BackButton {...args} variant="tonal" />
            </Row>
            <Row caption="B · lange Bezeichnung">
                <BackButton {...args} variant="text" />
            </Row>
            <Row caption="C · lange Bezeichnung">
                <BackButton
                    {...args}
                    variant="breadcrumb"
                    label="Träger-Verwaltung für Beratungsstellen"
                    current={LONG_CURRENT}
                />
            </Row>
        </div>
    ),
    play: async ({ canvasElement }) => {
        const link = within(canvasElement).getAllByRole('link', { name: LONG_LABEL })[0];
        const label = within(link).getByText(LONG_LABEL);
        // Shortened, and the row did not grow past its container.
        await expect(label.scrollWidth).toBeGreaterThan(label.clientWidth);
        await expect(link.getBoundingClientRect().width).toBeLessThanOrEqual(420);
        await userEvent.hover(link);
        await expect(await within(document.body).findByRole('tooltip')).toHaveTextContent(LONG_LABEL);
        await userEvent.unhover(link);
        // The cut-off current page of the breadcrumb is reachable by keyboard and shows its full name.
        const current = within(canvasElement).getByText(LONG_CURRENT);
        await expect(current.scrollWidth).toBeGreaterThan(current.clientWidth);
        // Start on the parent link and press Tab: the cut-off name must be the next tab stop, not only
        // focusable by script.
        const parent = within(canvasElement).getByRole('link', { name: 'Träger-Verwaltung für Beratungsstellen' });
        parent.focus();
        await userEvent.tab();
        await expect(current).toHaveFocus();
        await waitFor(() => expect(within(document.body).getByRole('tooltip')).toHaveTextContent(LONG_CURRENT));
        current.blur();
    },
};

/** Icon only, as in the mobile bottom bar: the name moves to `aria-label` and the tooltip. */
export const IconOnly: Story = {
    render: (args) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <Row caption="A · nur Symbol">
                <BackButton {...args} variant="tonal" iconOnly />
            </Row>
            <Row caption="B · nur Symbol">
                <BackButton {...args} variant="text" iconOnly />
            </Row>
            {/* Stand-in for the mobile bottom bar (AdminMobileNav): back, search, room for the FAB. */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 12,
                    background: 'var(--m3-surface-container, #f0edee)',
                    borderRadius: 16,
                }}
            >
                <span style={{ display: 'inline-flex' }}>
                    <BackButton {...args} variant="tonal" iconOnly to="/admin/tenants" />
                </span>
                <span
                    aria-hidden
                    style={{
                        flex: 1,
                        height: 40,
                        borderRadius: 20,
                        background: 'var(--m3-surface-container-high, #eae7e8)',
                    }}
                />
            </div>
        </div>
    ),
    play: async ({ canvasElement }) => {
        const links = within(canvasElement).getAllByRole('link', { name: 'Zurück zu Träger' });
        await expect(links[0].getBoundingClientRect().width).toBeCloseTo(40, 0);
        await userEvent.hover(links[0]);
        await expect(await within(document.body).findByRole('tooltip')).toHaveTextContent('Zurück zu Träger');
        await userEvent.unhover(links[0]);
    },
};

/** Without a `to` the control is a button, for "back in history" or a check before leaving. */
export const AsButton: Story = {
    args: { to: undefined, variant: 'tonal', label: 'Zurück' },
    play: async ({ canvasElement }) => {
        const button = within(canvasElement).getByRole('button', { name: 'Zurück' });
        await userEvent.tab();
        await expect(button).toHaveFocus();
    },
};
