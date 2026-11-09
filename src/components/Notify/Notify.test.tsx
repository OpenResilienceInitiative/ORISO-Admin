import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { snackbar, SnackbarHost } from '../Snackbar';
import { Notify } from './index';

const Harness = ({ disabled, onClick }: { disabled: boolean; onClick: () => void }) => (
    <>
        <SnackbarHost />
        <Notify severity="error" title="Draft" actions={[{ label: 'Retry', onClick, disabled }]}>
            Could not save
        </Notify>
    </>
);

describe('Notify actions', () => {
    afterEach(() => {
        act(() => snackbar.clear());
    });

    it('forwards a disabled action to the pop-up and enables it again in place', async () => {
        const onClick = vi.fn();
        const { rerender } = render(<Harness disabled onClick={onClick} />);
        const button = await screen.findByRole('button', { name: 'Retry' });
        expect(button).toBeDisabled();
        await userEvent.click(button);
        expect(onClick).not.toHaveBeenCalled();
        expect(screen.getAllByTestId('snackbar')).toHaveLength(1);

        rerender(<Harness disabled={false} onClick={onClick} />);
        expect(await screen.findByRole('button', { name: 'Retry' })).toBeEnabled();
        expect(screen.getAllByTestId('snackbar')).toHaveLength(1);
    });

    it('does not bring back a pop-up the person has closed when only the disabled state changes', async () => {
        const { rerender } = render(<Harness disabled onClick={vi.fn()} />);
        await screen.findByRole('button', { name: 'Retry' });
        await userEvent.click(screen.getByRole('button', { name: /close|schließen/i }));
        expect(screen.queryByTestId('snackbar')).not.toBeInTheDocument();

        rerender(<Harness disabled={false} onClick={vi.fn()} />);
        expect(screen.queryByTestId('snackbar')).not.toBeInTheDocument();
    });
});
