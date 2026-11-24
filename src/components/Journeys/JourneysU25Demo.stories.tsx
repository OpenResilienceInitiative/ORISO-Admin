import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook subpath export
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { addStep, removeStep, standardJourney, type Journey } from './journey';
import { JourneysSettings } from './index';
import { fakeSuggester, fakeTranslator } from './journeyFakes';

/**
 * **U25 demo: the first reply comes from the journey** (ADR-036 decision 42, ORISO-Admin#1660).
 *
 * The editor replaces the greeting of the U25 journey with an accordion box of their own:
 *
 * 1. create a box (step kind „Infobox“) and write its title and text,
 * 2. drag it to the top of the on-board phase,
 * 3. delete „Begrüßung der Beratungsstelle“,
 * 4. save.
 *
 * The next U25 advice seeker then gets this box as their first reply. Without a safety box of
 * the journey's own, the platform adds its emergency numbers to that reply; the editor is told so.
 *
 * **Saving makes the journey live at once — there is no draft yet.** On Dev, try this only with
 * the U25 demo topic „[U25] Suizidprävention“.
 */
const topics = [
    { id: 1, name: 'Schwangerschaft' },
    { id: 3, name: '[U25] Suizidprävention' },
];

let u25: Journey = { ...standardJourney('AGENCY_COUNSELLING', 'u25', 1), name: 'U25' };
u25 = removeStep(u25, 'departure', 'u25:postcode');
u25 = addStep(u25, 'departure', { kind: 'addon', addon: 'age' }, 'u25-age', 'u25:topic');
u25 = { ...u25, routes: { registration: [3], links: [] } };

const meta = {
    title: 'Settings/Einstellungen/Reisen/U25 demo',
    id: 'settings-journeys-u25-demo',
    component: JourneysSettings,
    parameters: { layout: 'padded' },
    args: {
        topics,
        journeys: [u25],
        translator: fakeTranslator,
        suggester: fakeSuggester,
        canEditAppearance: false,
        onSave: fn(),
        initiallyOpen: { type: 'AGENCY_COUNSELLING' as const, journeyId: 'u25', phase: 'flight' },
    },
} satisfies Meta<typeof JourneysSettings>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Drags one step onto another, as the browser does: React renders between the events. */
const dragStep = async (from: HTMLElement, onto: HTMLElement, side: 'before' | 'after') => {
    const dataTransfer = new DataTransfer();
    const tick = () =>
        new Promise((resolve) => {
            setTimeout(resolve, 0);
        });
    from.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer }));
    await tick();
    const box = onto.getBoundingClientRect();
    const clientY = box.top + box.height * (side === 'before' ? 0.25 : 0.75);
    onto.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer, clientY }));
    await tick();
    onto.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer, clientY }));
    await tick();
    from.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer }));
};

const stepIds = (phase: HTMLElement) =>
    within(within(phase).getByRole('list', { name: /Schritte der Phase/ }))
        .getAllByRole('listitem')
        .map((item) => item.getAttribute('data-testid'));

const BOX_TITLE = 'Schön, dass Du da bist';

/** Steps 1–3: the box is created, dragged to the top, and the old greeting is deleted. */
const buildTheBox = async (canvasElement: HTMLElement) => {
    const body = within(canvasElement.ownerDocument.body);
    const phase = await body.findByTestId('journey-phase-flight');
    await expect(within(phase).getByTestId('journey-step-agencyGreeting')).toBeInTheDocument();

    // 1. Create the box and write its title.
    await userEvent.click(within(phase).getByRole('button', { name: 'Schritt hinzufügen' }));
    await userEvent.click(await body.findByTestId('journey-add-panel'));
    const stepDialog = await body.findByTestId('journey-step-dialog');
    const [aspect] = within(stepDialog).getAllByTestId(/^journey-aspect-/);
    await userEvent.type(within(aspect).getAllByRole('textbox')[0], BOX_TITLE);
    await userEvent.click(within(stepDialog).getByRole('button', { name: 'Übernehmen' }));

    // 2. Drag it to the top of the on-board phase.
    const created = stepIds(phase).find((id) => id?.startsWith('journey-step-new:'));
    await expect(created).toBeDefined();
    const first = stepIds(phase)[0];
    await dragStep(body.getByTestId(created as string), body.getByTestId(first as string), 'before');
    await waitFor(() => expect(stepIds(phase)[0]).toBe(created));

    // 3. Delete the old greeting.
    await userEvent.click(
        within(phase).getByRole('button', { name: 'Weitere Aktionen für Begrüßung der Beratungsstelle' }),
    );
    await userEvent.click(await body.findByRole('menuitem', { name: 'Löschen' }));
    await waitFor(() => expect(within(phase).queryByTestId('journey-step-agencyGreeting')).not.toBeInTheDocument());
    // The editor is told that the platform adds its emergency numbers.
    await expect(await within(phase).findByTestId('journey-safety-warning')).toHaveTextContent(
        'In der ersten Antwort der Mailberatung ergänzt die Plattform ihre Notfallnummern',
    );
    return { body, phase };
};

/** Before saving: the new box is step 1, the greeting is gone, the editor sees the safety note. */
export const BoxInPlaceBeforeSaving: Story = {
    play: async ({ canvasElement }) => {
        await buildTheBox(canvasElement);
    },
};

/** The whole demo, from the on-board phase to the saved journey (saving is live at once). */
export const ReplaceTheGreetingWithABox: Story = {
    play: async ({ canvasElement, args }) => {
        const { body, phase } = await buildTheBox(canvasElement);

        // 4. Apply the phase and save the journey: this is live at once.
        await userEvent.click(within(phase).getByRole('button', { name: 'Übernehmen' }));
        await userEvent.click(within(body.getByTestId('journeys-dialog')).getByRole('button', { name: 'Speichern' }));
        await waitFor(() => expect(args.onSave).toHaveBeenCalled());
        const [saved] = (args.onSave as ReturnType<typeof fn>).mock.calls.at(-1) as [Journey[]];
        const flight = saved.find((journey) => journey.id === 'u25')?.phases.flight ?? [];
        await expect(flight[0]).toEqual(
            expect.objectContaining({
                kind: 'panel',
                aspects: [expect.objectContaining({ title: expect.objectContaining({ de: BOX_TITLE }) })],
            }),
        );
        await expect(flight.some((step) => step.core === 'agencyGreeting')).toBe(false);
    },
};

const group: Journey = removeStep(
    { ...standardJourney('SELF_HELP', 'group', 1), name: 'Gruppe' },
    'flight',
    'group:agencyGreeting',
);

/**
 * Only the on-board phase of message counselling builds the first reply. A group journey without
 * a safety section keeps the strict warning: nobody adds emergency numbers there.
 */
export const OtherConversationTypesKeepTheStrictWarning: Story = {
    args: {
        journeys: [group],
        initiallyOpen: { type: 'SELF_HELP' as const, journeyId: 'group', phase: 'flight' },
    },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        const warning = await body.findByTestId('journey-safety-warning');
        await expect(warning).toHaveTextContent('sehen dann keine Notfallnummern mehr');
        await expect(warning).not.toHaveTextContent('ergänzt die Plattform');
    },
};
