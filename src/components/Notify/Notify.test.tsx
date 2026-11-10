import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { snackbar, SnackbarHost, snackbarStore } from '../Snackbar';
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

    it('replaces the pop-up where it is when the text changes, and removes it on unmount', async () => {
        const Text = ({ text, shown = true }: { text: string; shown?: boolean }) => (
            <>
                <SnackbarHost />
                <Notify severity="error" title="Draft" causeKey="draft">
                    {shown ? text : null}
                </Notify>
            </>
        );
        const { rerender, unmount } = render(<Text text="first" />);
        await screen.findByText('first');
        act(() => {
            snackbar.info('later');
        });
        rerender(<Text text="second" />);
        expect(await screen.findByText('second')).toBeInTheDocument();
        expect(screen.getAllByTestId('snackbar')).toHaveLength(2);
        // Still first in the stack: no dismiss and re-raise in between.
        expect(snackbarStore.getState().visible.map((item) => item.severity)).toEqual(['error', 'info']);
        unmount();
        expect(snackbarStore.getState().visible.map((item) => item.severity)).toEqual(['info']);
    });

    it('retries the errored queries from the pop-up', async () => {
        const fetcher = vi.fn().mockRejectedValue(new Error('down'));
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const Failing = () => {
            const query = useQuery({ queryKey: ['notify-retry'], queryFn: fetcher });
            return query.isError ? (
                <Notify retry severity="error" title="Data">
                    Could not load
                </Notify>
            ) : null;
        };
        render(
            <QueryClientProvider client={client}>
                <SnackbarHost />
                <Failing />
            </QueryClientProvider>,
        );
        const retry = await screen.findByRole('button', { name: /retry|erneut|notify\.retry/i });
        expect(fetcher).toHaveBeenCalledTimes(1);
        await userEvent.click(retry);
        await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    });

    it('takes the person to the element the Notify sits in, by default', async () => {
        render(
            <>
                <SnackbarHost />
                <section data-testid="owner" tabIndex={-1}>
                    <h2>Owner heading</h2>
                    <Notify severity="error" title="Data">
                        Could not save
                    </Notify>
                </section>
            </>,
        );
        await userEvent.click(await screen.findByRole('button', { name: /ansehen|view|snackbar\.jump/i }));
        await waitFor(() => expect(screen.getByRole('heading', { name: 'Owner heading' })).toHaveFocus());
        // Looking at the tile does not dismiss the pop-up: the error is still true.
        expect(screen.getByRole('button', { name: /ansehen|view|snackbar\.jump/i })).toBeInTheDocument();
    });
});
