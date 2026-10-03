import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, waitFor } from 'storybook/test';
import { AdminSegmentedTabs } from '../AdminSegmentedTabs/AdminSegmentedTabs';
import { TabScroller } from './TabScroller';

const TABS = [
    { id: 'counsellors', label: 'Beratende' },
    { id: 'agency-admins', label: 'BST-Admins' },
    { id: 'tenant-admins', label: 'Träger-Admins' },
    { id: 'platform-admins', label: 'Plattform-Admins' },
];

/** Tab row with ‹ › arrows once the tabs no longer fit; arrows at an edge are disabled. */
const meta = {
    title: 'Molecules/UserTable/TabScroller',
    component: TabScroller,
    parameters: { layout: 'padded' },
    args: { children: null },
} satisfies Meta<typeof TabScroller>;

export default meta;
type Story = StoryObj<typeof meta>;

const Tabs = ({ width, count }: { width: number; count: number }) => {
    const [active, setActive] = useState('counsellors');
    return (
        <div style={{ width }}>
            <TabScroller>
                <AdminSegmentedTabs
                    ariaLabel="Kontoarten"
                    items={TABS.slice(0, count)}
                    activeId={active}
                    onChange={setActive}
                />
            </TabScroller>
        </div>
    );
};

export const Overflowing: Story = {
    render: () => <Tabs width={360} count={4} />,
    play: async ({ canvas, userEvent }) => {
        const left = await canvas.findByRole('button', { name: /Tabs nach links|Scroll tabs left/ });
        const right = canvas.getByRole('button', { name: /Tabs nach rechts|Scroll tabs right/ });
        await expect(left).toBeDisabled();
        await expect(right).toBeEnabled();

        await userEvent.click(right);
        await waitFor(() => expect(left).toBeEnabled());
    },
};

/** Tabs that fit get no arrows. */
export const Fitting: Story = {
    render: () => <Tabs width={900} count={2} />,
    play: async ({ canvas }) => {
        await expect(canvas.getAllByRole('tab')).toHaveLength(2);
        await expect(canvas.queryByRole('button', { name: /Tabs nach|Scroll tabs/ })).toBeNull();
    },
};
