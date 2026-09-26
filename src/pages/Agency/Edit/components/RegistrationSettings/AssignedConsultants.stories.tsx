import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect } from 'storybook/test';
import { AssignedConsultants } from './AssignedConsultants';

/**
 * Counsellors already assigned to a Beratungsstelle, shown in the "Sichtbarkeit in der
 * Registrierung" card next to the add picker (#1069). Removal needs the card in edit mode
 * and a confirmation; the list comes from GET /useradmin/agencies/{id}/consultants.
 */
const meta: Meta<typeof AssignedConsultants> = {
    title: 'Organisms/Agency/AssignedConsultants',
    component: AssignedConsultants,
    decorators: [
        (Story) => (
            <div style={{ maxWidth: 520, padding: 24, background: 'var(--m3-surface-container-lowest, #fff)' }}>
                <Story />
            </div>
        ),
    ],
    args: { agencyId: '55', editing: true },
};

export default meta;

type Story = StoryObj<typeof AssignedConsultants>;

const consultant = (id: string, firstname: string, lastname: string) => ({
    _embedded: { id, firstname, lastname, email: `${firstname.toLowerCase()}@example.org` },
});

const withConsultants = (entries: ReturnType<typeof consultant>[]) => ({
    msw: {
        handlers: [
            http.get('*/service/useradmin/agencies/55/consultants', () =>
                HttpResponse.json({ total: entries.length, _embedded: entries, _links: {} }),
            ),
        ],
    },
});

/** Edit mode: every assigned person as an input chip with a remove action. */
export const Editing: Story = {
    parameters: withConsultants([consultant('c-1', 'Erika', 'Muster'), consultant('c-2', 'Max', 'Admin')]),
    play: async ({ canvas }) => {
        await expect(await canvas.findByText('Erika Muster')).toBeInTheDocument();
    },
};

/** View mode: the list stays visible, the remove action is disabled (disable, not hide). */
export const ReadOnly: Story = {
    args: { editing: false },
    parameters: withConsultants([consultant('c-1', 'Erika', 'Muster')]),
};

/** Nobody assigned yet. */
export const Empty: Story = {
    parameters: withConsultants([]),
};
