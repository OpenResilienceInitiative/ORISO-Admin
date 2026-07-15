import { useState } from 'react';
import { BankOutlined, FilterOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, within } from 'storybook/test';
import { FilterInput } from './FilterInput';
import { FilterMultiselect } from './FilterMultiselect';
import { FilterSelect, type FilterOption } from './FilterSelect';
import { TableFilterBar } from './TableFilterBar';

// The global table-listing filter bar (Figma nodes 1165-16538 / 16407 / 16926):
// a rounded, segmented bar whose first segment is a caret + search toggle that
// expands an auto-focusing search field, followed by the caller's filter fields.
const meta = {
    title: 'Organisms/TableFilterBar',
    component: TableFilterBar,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'A single rounded, segmented filter bar. The first segment is a caret + search toggle that expands an auto-focusing search field; the rest are composable `FilterInput` / `FilterSelect` / `FilterMultiselect` segments. First segment rounds left, last rounds right, and inner borders collapse into shared dividers. Colours track the `--m3-*` design tokens.',
            },
        },
    },
    args: { ariaLabel: 'Tabellenfilter' },
} satisfies Meta<typeof TableFilterBar>;

export default meta;
type Story = StoryObj<typeof meta>;

const TENANTS: FilterOption[] = [
    { label: 'Musterstadt', value: 'musterstadt' },
    { label: 'Beispielhausen', value: 'beispielhausen' },
    { label: 'Demo-Mandant', value: 'demo' },
];

const TEMPLATES: FilterOption[] = [
    { label: 'Greeting text Eng', value: 'greeting-eng' },
    { label: 'Carrier invite (Nord)', value: 'carrier-nord' },
    { label: 'Test invitation template', value: 'test' },
];

const STATUSES: FilterOption[] = [
    { label: 'Eingeladen', value: 'invited' },
    { label: 'Zugestellt', value: 'delivered' },
    { label: 'Geöffnet', value: 'opened' },
    { label: 'Fehlgeschlagen', value: 'failed' },
];

interface BarState {
    query: string;
    firstName: string;
    tenant: string | null;
    template: string | null;
    status: string[];
}

/** Bar wired to local state so search, inputs and selects all behave end-to-end. */
const StatefulBar = ({
    initial,
    defaultSearchExpanded,
}: {
    initial?: Partial<BarState>;
    defaultSearchExpanded?: boolean;
}) => {
    const [state, setState] = useState<BarState>({
        query: '',
        firstName: '',
        tenant: null,
        template: null,
        status: [],
        ...initial,
    });

    return (
        <TableFilterBar
            ariaLabel="Tabellenfilter"
            defaultSearchExpanded={defaultSearchExpanded}
            searchPlaceholder="Empfänger suchen …"
            searchAriaLabel="Empfänger suchen"
            searchValue={state.query}
            onSearchChange={(query) => setState((prev) => ({ ...prev, query }))}
        >
            <FilterInput
                label="Vorname"
                placeholder="Vorname"
                icon={<UserOutlined />}
                value={state.firstName}
                onValueChange={(firstName) => setState((prev) => ({ ...prev, firstName }))}
            />
            <FilterSelect
                label="Mandant"
                icon={<BankOutlined />}
                options={TENANTS}
                value={state.tenant}
                onChange={(tenant) => setState((prev) => ({ ...prev, tenant }))}
            />
            <FilterSelect
                label="E-Mail-Vorlage"
                icon={<MailOutlined />}
                options={TEMPLATES}
                value={state.template}
                onChange={(template) => setState((prev) => ({ ...prev, template }))}
            />
            <FilterMultiselect
                label="Status"
                icon={<FilterOutlined />}
                options={STATUSES}
                value={state.status}
                onChange={(status) => setState((prev) => ({ ...prev, status }))}
            />
        </TableFilterBar>
    );
};

/** Default collapsed: search shows only the caret + magnifier; segments are bordered. */
export const CollapsedDefault: Story = {
    render: () => <StatefulBar />,
};

/** Expanded search: the field is revealed (and would auto-focus on user toggle). */
export const ExpandedSearch: Story = {
    render: () => <StatefulBar defaultSearchExpanded initial={{ query: 'anna@' }} />,
};

/** Some filters applied — selected segments carry the brand outline / count badge. */
export const WithSelection: Story = {
    render: () => <StatefulBar initial={{ tenant: 'beispielhausen', status: ['invited', 'opened'] }} />,
};

/** Interaction: clicking the caret expands the search and moves focus into the field. */
export const ExpandSearchInteraction: Story = {
    render: () => <StatefulBar />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const toggle = canvas.getByRole('button', { name: 'Suche ein-/ausklappen' });
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');

        await userEvent.click(toggle);
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');

        const search = canvas.getByRole('textbox', { name: 'Empfänger suchen' });
        await expect(search).toHaveFocus();
        await userEvent.type(search, 'anna@example.org');
        await expect(search).toHaveValue('anna@example.org');
    },
};
