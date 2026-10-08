import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, within } from 'storybook/test';
import { ConsentUnavailableNotice } from './index';

/**
 * Stand-in for the consent trigger wherever the consent sentence cannot be edited
 * (#914). Before this, the editor's function bar simply had a gap there.
 */
const meta = {
    title: 'Organisms/Legal/ConsentUnavailableNotice',
    component: ConsentUnavailableNotice,
    parameters: { layout: 'padded' },
    args: { reason: 'noDepartments', language: 'de' },
} satisfies Meta<typeof ConsentUnavailableNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Closed surface: the pill sits in the function bar, muted but operable. */
export const Closed: Story = {};

/**
 * A Beratungsstelle without a single Fachbereich. The dialog carries the operator
 * disclaimer: no certified counselling can be offered until a Fachbereich exists,
 * and running the centre anyway is the operator's own risk.
 */
export const NoDepartments: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByTestId('consent-unavailable-trigger'));
        // The dialog portals to the body, so it is found on the document, not the canvas.
        // Asserted as mounted with its copy, not as `toBeVisible`: antd's enter
        // transition does not settle inside the headless run, so the sheet is still
        // at opacity 0 the moment the play function reaches this line.
        const disclaimer = await within(document.body).findByTestId('consent-unavailable-disclaimer');
        await expect(disclaimer).toBeInTheDocument();
        await expect(disclaimer.textContent?.length ?? 0).toBeGreaterThan(80);
    },
};

/**
 * The disclaimer follows the legal-content language, the same rule the consent
 * sentence it stands in for obeys — here Ukrainian.
 */
export const NoDepartmentsUkrainian: Story = {
    args: { language: 'uk' },
    play: NoDepartments.play,
};

/**
 * Fachbereiche exist and the switcher is on "Alle Fachbereiche", which #862 keeps
 * consent-free. Nothing is wrong here — the sentence is one selection away.
 */
export const AllDepartments: Story = {
    args: { reason: 'allDepartments' },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByTestId('consent-unavailable-trigger'));
        const body = await within(document.body).findByTestId('consent-unavailable-body');
        await expect(body).toBeInTheDocument();
        // The agency-wide case explains; it never carries the operator disclaimer.
        await expect(within(body).queryByTestId('consent-unavailable-disclaimer')).toBeNull();
    },
};
