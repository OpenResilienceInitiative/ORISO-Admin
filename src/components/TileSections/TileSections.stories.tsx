import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, within } from 'storybook/test';
import { TileSections } from './index';

/** The tile body of the Beratungsstelle and Träger edit pages at 1440px: 1264px minus the tile's own padding. */
const Frame = ({ width, children }: { width: number; children: React.ReactNode }) => (
    <div style={{ width, padding: 16, background: 'var(--m3-surface-container, #f0edee)', borderRadius: 24 }}>
        {children}
    </div>
);

const meta = {
    title: 'Molecules/TileSections',
    component: TileSections,
    parameters: { layout: 'padded' },
} satisfies Meta<typeof TileSections>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The grid is the parent of the first panel. */
const gridOf = (canvasElement: HTMLElement) => canvasElement.querySelector('section[role="group"]')!.parentElement!;

/** Boxes of the grid's direct children that take one column (a stack counts as one). */
const panelWidths = (canvasElement: HTMLElement) =>
    Array.from(gridOf(canvasElement).children)
        .filter((panel) => !/sectionWide/.test(panel.className))
        .map((panel) => panel.getBoundingClientRect());

/** The panels under a wide panel share the whole row: no empty columns on the right. */
const expectRowFilled = async (canvasElement: HTMLElement) => {
    const grid = gridOf(canvasElement).getBoundingClientRect();
    const panels = panelWidths(canvasElement);
    const rightmost = Math.max(...panels.map((panel) => panel.right));
    await expect(Math.abs(rightmost - grid.right)).toBeLessThanOrEqual(1);
};

/**
 * Beratungsstelle edit (Stammdaten): Status wide on top, then the general information beside the stacked
 * visibility and offer panels. Before ORISO-Admin#1543 the wide panel kept four 280px columns alive and the two
 * panels below sat narrow on the left, two empty columns beside them.
 */
export const AgencyStatusAboveTwoPanels: Story = {
    args: { children: null },
    render: () => (
        <Frame width={1216}>
            <TileSections>
                <TileSections.Section wide id="status" title="Status">
                    Aktiv
                </TileSections.Section>
                <TileSections.Section id="general" title="Allgemeine Informationen">
                    Name, Adresse, Telefon
                </TileSections.Section>
                <TileSections.Stack>
                    <TileSections.Section id="visibility" title="Sichtbarkeit in der Registrierung">
                        Zugewiesene Beratende
                    </TileSections.Section>
                    <TileSections.Section id="offer" title="Angebot">
                        Themen
                    </TileSections.Section>
                </TileSections.Stack>
            </TileSections>
        </Frame>
    ),
    play: async ({ canvasElement }) => {
        await expectRowFilled(canvasElement);
        // Two columns of equal width, not four narrow ones.
        const [general, stack] = panelWidths(canvasElement);
        await expect(Math.abs(general.width - stack.width)).toBeLessThanOrEqual(1);
        await expect(general.top).toBe(stack.top);
    },
};

/** Träger edit (Stammdaten): Status wide on top, three panels below fill the row in three columns. */
export const TraegerStatusAboveThreePanels: Story = {
    args: { children: null },
    render: () => (
        <Frame width={1216}>
            <TileSections>
                <TileSections.Section wide id="status" title="Status">
                    Aktiv
                </TileSections.Section>
                <TileSections.Section id="general" title="Allgemein">
                    Name, Anzahl Beratende
                </TileSections.Section>
                <TileSections.Stack keepColumn>
                    <TileSections.Section id="sender" title="Absender und Kontakt">
                        E-Mail, Telefon
                    </TileSections.Section>
                    <TileSections.Section id="topic" title="Thema">
                        Thema
                    </TileSections.Section>
                </TileSections.Stack>
                <TileSections.Section id="dpo" title="Datenschutzbeauftragte:r">
                    Name, Adresse
                </TileSections.Section>
            </TileSections>
        </Frame>
    ),
    play: async ({ canvasElement }) => {
        await expectRowFilled(canvasElement);
        const panels = panelWidths(canvasElement);
        await expect(new Set(panels.map((panel) => Math.round(panel.top))).size).toBe(1);
    },
};

/** On a phone the same tile stacks every panel full width. */
export const PhoneStacksPanels: Story = {
    ...AgencyStatusAboveTwoPanels,
    render: () => (
        <Frame width={358}>
            <TileSections>
                <TileSections.Section wide id="status" title="Status">
                    Aktiv
                </TileSections.Section>
                <TileSections.Section id="general" title="Allgemeine Informationen">
                    Name
                </TileSections.Section>
                <TileSections.Section id="visibility" title="Sichtbarkeit">
                    Beratende
                </TileSections.Section>
            </TileSections>
        </Frame>
    ),
    play: async ({ canvasElement }) => {
        const [first, second] = panelWidths(canvasElement);
        await expect(second.top).toBeGreaterThan(first.top);
        await expect(Math.round(first.width)).toBe(Math.round(second.width));
    },
};

/**
 * Foldable sections as on the Mailberatung tile (Frank, 2026-11-24): the fold icon leads the heading;
 * "Reisen" and "Fälle von Ratsuchenden teilen" start folded, the others start open.
 */
export const FoldableSections: Story = {
    args: { children: null },
    render: () => (
        <Frame width={1216}>
            <TileSections>
                <TileSections.Section wide id="journeys" title="Reisen" collapsible defaultOpen={false}>
                    Reisen und Ziele
                </TileSections.Section>
                <TileSections.Section wide id="features" title="konfigurierbare Zusatzfunktionen" collapsible>
                    Videoanrufe, Audioanrufe
                </TileSections.Section>
                <TileSections.Section
                    wide
                    id="sharing"
                    title="Fälle von Ratsuchenden teilen"
                    collapsible
                    defaultOpen={false}
                >
                    Fallübergabe, Teamberatung, Keine
                </TileSections.Section>
            </TileSections>
        </Frame>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const journeys = canvas.getByRole('button', { name: 'Reisen' });
        const features = canvas.getByRole('button', { name: 'konfigurierbare Zusatzfunktionen' });
        await expect(journeys).toHaveAttribute('aria-expanded', 'false');
        await expect(features).toHaveAttribute('aria-expanded', 'true');
        await expect(canvas.queryByText('Reisen und Ziele')).not.toBeVisible();
        // The icon sits left of the heading text.
        const [icon, label] = Array.from(journeys.children).map((child) => child.getBoundingClientRect());
        await expect(icon.right).toBeLessThanOrEqual(label.left);
        await userEvent.click(journeys);
        await expect(canvas.getByText('Reisen und Ziele')).toBeVisible();
    },
};
