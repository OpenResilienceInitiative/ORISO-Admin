import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTablePagination } from './DataTablePagination';

// Interpolating t-mock (repo pattern) so the range values land in the label.
const t = (key: string, fallback?: string, options?: Record<string, unknown>) => {
    let text = fallback ?? key;
    Object.entries(options ?? {}).forEach(([name, value]) => {
        text = text.replaceAll(`{{${name}}}`, String(value));
    });
    return text;
};

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t }),
}));

describe('DataTablePagination', () => {
    const renderPagination = (props: Partial<React.ComponentProps<typeof DataTablePagination>> = {}) => {
        const onPageChange = vi.fn();
        const onPageSizeChange = vi.fn();
        render(
            <DataTablePagination
                page={1}
                pageSize={10}
                total={34}
                onPageChange={onPageChange}
                onPageSizeChange={onPageSizeChange}
                {...props}
            />,
        );
        return { onPageChange, onPageSizeChange };
    };

    it('renders the localized range', () => {
        renderPagination({ page: 2 });
        expect(screen.getByText('11–20 von 34')).toBeInTheDocument();
    });

    it('renders an empty range as 0–0', () => {
        renderPagination({ total: 0 });
        expect(screen.getByText('0–0 von 0')).toBeInTheDocument();
    });

    it('disables previous on the first page and navigates forward', async () => {
        const user = userEvent.setup();
        const { onPageChange } = renderPagination();

        expect(screen.getByRole('button', { name: 'Vorherige Seite' })).toBeDisabled();
        await user.click(screen.getByRole('button', { name: 'Nächste Seite' }));
        expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it('disables next on the last page and navigates backwards', async () => {
        const user = userEvent.setup();
        const { onPageChange } = renderPagination({ page: 4 });

        expect(screen.getByRole('button', { name: 'Nächste Seite' })).toBeDisabled();
        await user.click(screen.getByRole('button', { name: 'Vorherige Seite' }));
        expect(onPageChange).toHaveBeenCalledWith(3);
    });

    it('reports a new page size via the labelled select', async () => {
        const user = userEvent.setup();
        const { onPageSizeChange } = renderPagination();

        await user.selectOptions(screen.getByLabelText('Zeilen pro Seite'), '30');
        expect(onPageSizeChange).toHaveBeenCalledWith(30);
    });

    it('hides the page-size select when no handler is provided', () => {
        render(<DataTablePagination page={1} pageSize={10} total={5} onPageChange={vi.fn()} />);
        expect(screen.queryByLabelText('Zeilen pro Seite')).not.toBeInTheDocument();
    });
});
