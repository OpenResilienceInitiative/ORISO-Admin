import { useState } from 'react';
import ApartmentOutlined from '@mui/icons-material/ApartmentOutlined';
import HomeWorkOutlined from '@mui/icons-material/HomeWorkOutlined';
import PublicOutlined from '@mui/icons-material/PublicOutlined';
import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, waitFor, within } from 'storybook/test';
import { StatisticScopePicker, type ScopePickerTarget, type StatisticScopePickerProps } from './StatisticScopePicker';
import type { FilterTarget } from './statisticDashboardData';
import type { ScopeKey } from './types';

const LEVELS: StatisticScopePickerProps['levels'] = [
    { id: 'platform', label: 'Plattformweit', icon: <PublicOutlined fontSize="small" /> },
    { id: 'tenant', label: 'Träger', icon: <ApartmentOutlined fontSize="small" /> },
    { id: 'agency', label: 'Beratungsstellen', icon: <HomeWorkOutlined fontSize="small" /> },
];

const TARGETS: ScopePickerTarget[] = [
    { id: 't1', label: 'Caritas Hamburg', type: 'Träger', detail: '3 Beratungsstellen', scope: 'tenant' },
    { id: 't2', label: 'Diakonie Berlin', type: 'Träger', detail: '2 Beratungsstellen', scope: 'tenant' },
    { id: 'a1', label: 'Beratungsstelle Nord', type: 'Beratungsstelle', detail: 'Caritas Hamburg', scope: 'agency' },
    { id: 'a2', label: 'Jugendberatung Mitte', type: 'Beratungsstelle', detail: 'Diakonie Berlin', scope: 'agency' },
];

const LABELS: StatisticScopePickerProps['labels'] = {
    picker: 'Ansicht',
    levels: 'Ebene',
    search: 'Träger oder Beratungsstelle suchen',
    noMatch: 'Kein Treffer',
    selected: 'Ausgewählt',
    remove: (target) => `${target} entfernen`,
};

/** Holds level and selection like the Statistic page does. */
const Stateful = ({
    initialLevel = 'platform',
    initial = [],
}: {
    initialLevel?: ScopeKey;
    initial?: FilterTarget[];
}) => {
    const [level, setLevel] = useState<ScopeKey>(initialLevel);
    const [selected, setSelected] = useState<FilterTarget[]>(initial);
    return (
        <StatisticScopePicker
            levels={LEVELS}
            activeLevel={level}
            targets={TARGETS}
            selectedTargets={selected}
            onSelectLevel={(next) => {
                setLevel(next);
                setSelected([]);
            }}
            onSelectTarget={(target) => {
                setLevel(target.scope);
                setSelected((current) => [...current.filter((item) => item.type === target.type), target]);
            }}
            onRemoveTarget={(id) => setSelected((current) => current.filter((item) => item.id !== id))}
            labels={LABELS}
            describe={(text) => text}
            locale="de"
        />
    );
};

/**
 * One control for "which numbers am I looking at" (Admin#1510): the level tabs and the Träger /
 * Beratungsstelle search were two controls that both narrowed by Träger. Now one button opens a
 * panel with the levels and the search; what is picked stays visible as chips.
 */
const meta = {
    title: 'Organisms/Pages/Statistic/ScopePicker',
    component: Stateful,
    parameters: { layout: 'padded' },
} satisfies Meta<typeof Stateful>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Closed: the button names the current view. */
export const Closed: Story = {
    play: async ({ canvas }) => {
        const button = canvas.getByRole('button', { name: /^Ansicht:/ });
        await expect(button).toHaveAccessibleName(/Plattformweit/);
        await expect(canvas.queryByRole('dialog')).toBeNull();
    },
};

/** Open: levels and search in one panel; typing narrows, Enter picks and switches the level. */
export const PickByTyping: Story = {
    play: async ({ canvas, canvasElement, userEvent }) => {
        await userEvent.click(canvas.getByRole('button', { name: /^Ansicht:/ }));
        const dialog = await canvas.findByRole('dialog');
        await expect(dialog).toBeVisible();
        await expect(canvas.getByRole('button', { name: 'Beratungsstellen' })).toHaveAttribute('aria-pressed', 'false');
        const search = canvas.getByRole('combobox');
        await waitFor(() => expect(search).toHaveFocus());
        await userEvent.type(search, 'Jugend');
        await expect(canvas.getAllByRole('option')).toHaveLength(1);
        await userEvent.keyboard('{Enter}');
        await waitFor(() =>
            expect(canvas.getByRole('button', { name: /^Ansicht:/ })).toHaveAccessibleName(/Jugendberatung Mitte/),
        );
        await userEvent.keyboard('{Escape}');
        await waitFor(() => expect(canvasElement.querySelector('[role="dialog"]')).toBeNull());
    },
};

/** A level click shows all of it and clears a narrower selection. */
export const PickLevel: Story = {
    args: { initialLevel: 'agency', initial: [TARGETS[2]] },
    play: async ({ canvas, userEvent }) => {
        await expect(canvas.getByRole('button', { name: 'Beratungsstelle Nord entfernen' })).toBeVisible();
        await userEvent.click(canvas.getByRole('button', { name: /^Ansicht:/ }));
        const levels = within(await canvas.findByRole('dialog'));
        await userEvent.click(levels.getByRole('button', { name: 'Träger' }));
        await waitFor(() =>
            expect(canvas.queryByRole('button', { name: 'Beratungsstelle Nord entfernen' })).toBeNull(),
        );
        await expect(canvas.getByRole('button', { name: /^Ansicht:/ })).toHaveAccessibleName(/Träger/);
    },
};

/** A selection stays visible as a chip and can be removed without opening the panel. */
export const WithSelection: Story = {
    args: { initialLevel: 'tenant', initial: [TARGETS[0], TARGETS[1]] },
    play: async ({ canvas, userEvent }) => {
        await userEvent.click(canvas.getByRole('button', { name: 'Caritas Hamburg entfernen' }));
        await expect(canvas.queryByRole('button', { name: 'Caritas Hamburg entfernen' })).toBeNull();
        await expect(canvas.getByRole('button', { name: 'Diakonie Berlin entfernen' })).toBeVisible();
    },
};
