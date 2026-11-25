import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, waitFor } from 'storybook/test';
import { LoadMoreFooter } from './LoadMoreFooter';
import { UserCard } from './UserCard';

const PEOPLE = Array.from({ length: 9 }, (_, index) => ({
    id: index,
    name: `${['Maria Huber', 'Jan Petersen', 'Ayşe Demir'][index % 3]} ${index + 1}`,
    email: `person${index + 1}@caritas-berlin.de`,
}));

/** Phone list footer: how many are shown, and „Weitere laden" instead of pages. */
const meta = {
    title: 'Molecules/UserTable/LoadMoreFooter',
    component: LoadMoreFooter,
    parameters: { layout: 'padded' },
    args: { shown: 3, total: 9, onLoadMore: () => {} },
} satisfies Meta<typeof LoadMoreFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

const CardList = () => {
    const [shown, setShown] = useState(3);
    return (
        <div style={{ display: 'flex', maxWidth: 390, flexDirection: 'column', gap: 8 }}>
            {PEOPLE.slice(0, shown).map((person) => (
                <UserCard
                    key={person.id}
                    name={person.name}
                    email={person.email}
                    status="ACTIVE"
                    onEdit={() => {}}
                    onDelete={() => {}}
                />
            ))}
            <LoadMoreFooter shown={shown} total={PEOPLE.length} onLoadMore={() => setShown((n) => n + 3)} />
        </div>
    );
};

export const WithCards: Story = {
    render: () => <CardList />,
    play: async ({ canvas, userEvent }) => {
        const more = canvas.getByRole('button', { name: /Weitere laden|Load more/ });
        await expect(canvas.getAllByRole('article')).toHaveLength(3);
        await userEvent.click(more);
        await waitFor(() => expect(canvas.getAllByRole('article')).toHaveLength(6));
        await userEvent.click(more);
        await waitFor(() => expect(canvas.getAllByRole('article')).toHaveLength(9));
        // Everything loaded: the button stays, disabled.
        await expect(more).toBeDisabled();
        await expect(canvas.getByText(/9 von 9|9 of 9/)).toBeVisible();
    },
};
