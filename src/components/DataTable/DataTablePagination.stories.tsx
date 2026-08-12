import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DataTablePagination } from './DataTablePagination';

/**
 * Table pagination footer: rows-per-page select, "x–y von z" range, previous/
 * next. Buttons at the bounds are disabled, never hidden. Lives in the
 * `footer` slot of `DataTable`, which supplies the tonal footer surface.
 */
const meta = {
    title: 'Molecules/DataTable/Pagination',
    component: DataTablePagination,
    parameters: { layout: 'padded' },
    args: {
        page: 1,
        pageSize: 10,
        total: 34,
        onPageChange: () => {},
    },
} satisfies Meta<typeof DataTablePagination>;

export default meta;
type Story = StoryObj<typeof meta>;

const Interactive = () => {
    const [page, setPage] = useState(2);
    const [pageSize, setPageSize] = useState(10);

    return (
        <DataTablePagination
            page={page}
            pageSize={pageSize}
            total={34}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
            }}
        />
    );
};

/** Fully wired: page navigation plus rows-per-page (which resets to page 1). */
export const Wired: Story = { render: () => <Interactive /> };

/** First page: "previous" is disabled but stays visible. */
export const FirstPage: Story = { args: { onPageSizeChange: () => {} } };

/** Last page: "next" is disabled. */
export const LastPage: Story = { args: { page: 4, onPageSizeChange: () => {} } };

/** Empty result set reads 0–0 von 0 with both directions disabled. */
export const EmptyResult: Story = { args: { total: 0, onPageSizeChange: () => {} } };
