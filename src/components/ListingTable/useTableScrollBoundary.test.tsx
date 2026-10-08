import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ListingTable } from './ListingTable';
import { applyTableScrollBoundary } from './useTableScrollBoundary';

const columns = [{ title: 'Name', dataIndex: 'name', key: 'name' }];

describe('opt-in table scroll boundary', () => {
    it('names and focuses the actual holder, retains rows, and cleans up on unmount', async () => {
        const { container, rerender, unmount } = render(
            <ListingTable
                columns={columns}
                dataSource={[{ key: '1', name: 'Ada' }]}
                scroll={{ y: 240 }}
                pagination={false}
                scrollRegionLabel="Audit entries"
            />,
        );
        const region = await screen.findByRole('region', { name: 'Audit entries' });
        expect(region).toBe(container.querySelector('.ant-table-body'));
        expect(region).toHaveAttribute('tabindex', '0');
        expect(screen.getByText('Ada')).toBeInTheDocument();
        rerender(
            <ListingTable
                columns={columns}
                dataSource={[]}
                scroll={{ y: 240 }}
                pagination={false}
                scrollRegionLabel="Updated audit entries"
            />,
        );
        await waitFor(() => expect(region).toHaveAccessibleName('Updated audit entries'));
        expect(screen.queryByText('Ada')).not.toBeInTheDocument();
        unmount();
        expect(region).not.toHaveAttribute('role');
        expect(region).not.toHaveAttribute('tabindex');
    });

    it('keeps other callers unchanged and respects existing holder ownership', () => {
        const { container } = render(
            <ListingTable columns={columns} dataSource={[]} scroll={{ y: 240 }} pagination={false} />,
        );
        const holder = container.querySelector('.ant-table-body')!;
        expect(holder).not.toHaveAttribute('tabindex');
        holder.setAttribute('role', 'group');
        const release = applyTableScrollBoundary(container.firstElementChild as HTMLElement, 'Audit entries');
        expect(holder).toHaveAttribute('role', 'group');
        expect(holder).not.toHaveAttribute('tabindex');
        release();
    });
});
