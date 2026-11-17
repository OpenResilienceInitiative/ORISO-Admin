import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { FETCH_ERRORS } from '../../../../../api/fetchData';
import type { CounselorData } from '../../../../../types/counselor';
import { DeleteStatisticsReaderModal } from './index';

const mocks = vi.hoisted(() => ({
    mutate: vi.fn(),
    isPending: false,
    options: undefined as { onSuccess?: () => void; onError?: (error: Error) => void } | undefined,
    success: vi.fn(),
    error: vi.fn(),
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../../../components/Snackbar', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../../../../components/Snackbar')>();
    return { ...actual, snackbar: { ...actual.snackbar, success: mocks.success, error: mocks.error } };
});
vi.mock('../../../../../hooks/useStatisticsReaders', () => ({
    useDeleteStatisticsReader: (options: typeof mocks.options) => {
        mocks.options = options;
        return { mutate: mocks.mutate, isPending: mocks.isPending };
    },
}));

const reader = { id: '44', firstname: 'Sam', lastname: 'Reader' } as CounselorData;

describe('DeleteStatisticsReaderModal (ORISO-UserService#1666)', () => {
    beforeEach(() => {
        mocks.mutate.mockReset();
        mocks.success.mockReset();
        mocks.error.mockReset();
        mocks.isPending = false;
    });

    it('deletes the reader and closes after success', () => {
        const onClose = vi.fn();
        render(<DeleteStatisticsReaderModal user={reader} onClose={onClose} />);

        fireEvent.click(screen.getByRole('button', { name: 'delete' }));
        expect(mocks.mutate).toHaveBeenCalledWith('44');
        mocks.options?.onSuccess?.();
        expect(mocks.success).toHaveBeenCalledWith({ message: 'statisticsReaders.delete.success' });
        expect(onClose).toHaveBeenCalled();
    });

    it('reports a network failure and stays open for a retry', () => {
        const onClose = vi.fn();
        render(<DeleteStatisticsReaderModal user={reader} onClose={onClose} />);

        mocks.options?.onError?.(new TypeError('Failed to fetch'));
        expect(mocks.error).toHaveBeenCalledWith({ message: 'message.error.default' });
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'delete' })).toBeEnabled();
    });

    it('does not report an HTTP error twice: fetchData already showed it', () => {
        render(<DeleteStatisticsReaderModal user={reader} onClose={vi.fn()} />);

        mocks.options?.onError?.(new Error(FETCH_ERRORS.CATCH_ALL));
        expect(mocks.error).not.toHaveBeenCalled();
    });

    it('disables the confirmation while the delete is pending', () => {
        mocks.isPending = true;
        render(<DeleteStatisticsReaderModal user={reader} onClose={vi.fn()} />);

        const confirm = screen.getByRole('button', { name: 'delete' });
        expect(confirm).toBeDisabled();
        fireEvent.click(confirm);
        expect(mocks.mutate).not.toHaveBeenCalled();
    });
});
