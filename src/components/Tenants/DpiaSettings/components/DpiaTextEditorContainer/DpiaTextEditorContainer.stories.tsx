import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { createMockDpiaTextGateway, type DpiaTextGateway } from '../../api/dpiaTextGateway';
import { DpiaTextEditorContainer } from './index';

/**
 * The wired DSFA card with a gateway the story can switch off: both failures are raised by a real
 * rejected call, and "Erneut versuchen" calls the gateway again (no fake status flip).
 */
const meta = {
    title: 'Organisms/Dpia/DpiaTextEditorContainer',
    component: DpiaTextEditorContainer,
    parameters: { layout: 'padded' },
    args: { tenantId: 7 },
} satisfies Meta<typeof DpiaTextEditorContainer>;
export default meta;
type Story = StoryObj<typeof meta>;

type Outage = { loadDown: boolean; saveDown: boolean; loads: number; saves: number };

// One gateway per story run (module level, so a re-render does not create a new one and reload).
let outage: Outage;
let gateway: DpiaTextGateway;

/** A gateway over the in-memory mock whose load and save fail while the matching flag is set. */
const flakyGateway = (): DpiaTextGateway => {
    const inner = createMockDpiaTextGateway();
    return {
        load: async (tenantId) => {
            outage.loads += 1;
            if (outage.loadDown) throw new Error('DSFA store unavailable');
            return inner.load(tenantId);
        },
        save: async (tenantId, texts, publish) => {
            outage.saves += 1;
            if (outage.saveDown) throw new Error('DSFA store unavailable');
            return inner.save(tenantId, texts, publish);
        },
    };
};

const startOutage = (state: Outage) => {
    outage = state;
    gateway = flakyGateway();
};

const popupWith = (canvasElement: HTMLElement, text: string) =>
    within(canvasElement.ownerDocument.body)
        .queryAllByTestId('snackbar')
        .find((candidate) => candidate.textContent?.includes(text));

/**
 * The DSFA texts cannot be loaded (T7): the editor is withheld, the failure is an error pop-up with
 * "Erneut versuchen" and a quiet line in the tile. Retry calls the gateway again; once it answers the
 * pop-up is gone and the editor opens.
 */
export const LoadFailure: Story = {
    beforeEach: () => startOutage({ loadDown: true, saveDown: false, loads: 0, saves: 0 }),
    render: (args) => <DpiaTextEditorContainer {...args} gateway={gateway} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await waitFor(
            () => expect(popupWith(canvasElement, 'Die DSFA-Freitexte konnten nicht geladen werden.')).toBeDefined(),
            {
                timeout: 8000,
            },
        );
        const popup = popupWith(canvasElement, 'Die DSFA-Freitexte konnten nicht geladen werden.') as HTMLElement;
        await expect(popup).toHaveAttribute('data-severity', 'error');
        await expect(popup.textContent).toContain('Datenschutz-Folgenabschätzung');
        await expect(await canvas.findByText('Dieser Bereich konnte nicht geladen werden.')).toBeVisible();
        const loadsBeforeRetry = outage.loads;
        outage.loadDown = false;

        await userEvent.click(within(popup).getByRole('button', { name: 'Erneut versuchen' }));

        await waitFor(() => expect(outage.loads).toBeGreaterThan(loadsBeforeRetry));
        await expect(await canvas.findByRole('button', { name: 'Veröffentlichen' }, { timeout: 8000 })).toBeVisible();
        await waitFor(() =>
            expect(popupWith(canvasElement, 'Die DSFA-Freitexte konnten nicht geladen werden.')).toBeUndefined(),
        );
    },
};

/**
 * Saving fails (T7): the editor and its text stay, the failure is an error pop-up whose "Erneut
 * versuchen" replays the save through the gateway; once it succeeds the pop-up is gone.
 */
export const SaveFailure: Story = {
    beforeEach: () => startOutage({ loadDown: false, saveDown: true, loads: 0, saves: 0 }),
    render: (args) => <DpiaTextEditorContainer {...args} gateway={gateway} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole('button', { name: 'Veröffentlichen' }, { timeout: 8000 }));

        const saveError = 'Die Änderungen konnten nicht gespeichert werden.';
        await waitFor(() => expect(popupWith(canvasElement, saveError)).toBeDefined(), { timeout: 8000 });
        const popup = popupWith(canvasElement, saveError) as HTMLElement;
        await expect(popup).toHaveAttribute('data-severity', 'error');
        await expect(canvas.getByRole('button', { name: 'Veröffentlichen' })).toBeVisible();
        const savesBeforeRetry = outage.saves;
        outage.saveDown = false;

        await userEvent.click(within(popup).getByRole('button', { name: 'Erneut versuchen' }));

        await waitFor(() => expect(outage.saves).toBeGreaterThan(savesBeforeRetry));
        await waitFor(() => expect(popupWith(canvasElement, saveError)).toBeUndefined());
    },
};
