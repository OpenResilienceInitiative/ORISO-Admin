import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataTableToolbar } from './DataTableToolbar';

describe('DataTableToolbar', () => {
    it('renders the filters, search and actions slots', () => {
        render(
            <DataTableToolbar
                filters={<span>Chips</span>}
                search={<input aria-label="Suche" />}
                actions={<button type="button">Export</button>}
            />,
        );

        expect(screen.getByText('Chips')).toBeInTheDocument();
        expect(screen.getByLabelText('Suche')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
    });

    it('renders nothing for omitted slots', () => {
        render(<DataTableToolbar filters={<span>Chips</span>} />);

        expect(screen.getByText('Chips')).toBeInTheDocument();
        expect(screen.queryByLabelText('Suche')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Export' })).not.toBeInTheDocument();
        // Nothing but the one provided slot reaches the DOM.
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        expect(screen.queryAllByRole('button')).toHaveLength(0);
    });
});
