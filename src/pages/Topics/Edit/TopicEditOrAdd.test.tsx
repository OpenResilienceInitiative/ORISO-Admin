import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { FETCH_ERRORS } from '../../../api/fetchData';
import { TopicEditOrAdd } from '.';

const { snackbarError } = vi.hoisted(() => ({ snackbarError: vi.fn() }));
let mutationOptions: { onError?: (error: unknown) => void } = {};

vi.mock('react-i18next', async (importOriginal) => {
    const t = (key: string) => key;
    // Callers use both `const { t } = useTranslation()` and `const [t] = useTranslation()`.
    const translation = Object.assign([t], { t, i18n: { language: 'de' } });
    return { ...(await importOriginal<object>()), useTranslation: () => translation };
});
vi.mock('../../../components/Snackbar', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../../components/Snackbar')>();
    return { ...actual, snackbar: { ...actual.snackbar, error: snackbarError } };
});
vi.mock('../../../hooks/useTopicAdmin', () => ({ useTopicAdmin: () => ({ data: undefined, isLoading: false }) }));
vi.mock('../../../hooks/useAddOrUpdateTopicAdmin.hook', () => ({
    useAddOrUpdateTopicAdmin: (options: { onError?: (error: unknown) => void }) => {
        mutationOptions = options;
        return { mutate: vi.fn() };
    },
}));

describe('TopicEditOrAdd', () => {
    beforeEach(() => {
        snackbarError.mockClear();
        mutationOptions = {};
    });

    it('says the name is taken when the service answers a save with 409', () => {
        render(
            <QueryClientProvider client={new QueryClient()}>
                <MemoryRouter initialEntries={['/admin/topics/5']}>
                    <Routes>
                        <Route path="/admin/topics/:id" element={<TopicEditOrAdd />} />
                    </Routes>
                </MemoryRouter>
            </QueryClientProvider>,
        );

        mutationOptions.onError?.(new Error(FETCH_ERRORS.CONFLICT));

        expect(snackbarError).toHaveBeenCalledWith(expect.objectContaining({ content: 'topicDialog.nameTaken' }));
    });
});
