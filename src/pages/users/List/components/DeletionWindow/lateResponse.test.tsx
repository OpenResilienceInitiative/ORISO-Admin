import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DeletionWindowModal } from './index';

const api = vi.hoisted(() => ({ cancel: vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../../../api/counselor/cancelCounselorDeletion', () => ({ cancelCounselorDeletion: api.cancel }));
vi.mock('../../../../../api/counselor/pauseCounselorDeletion', () => ({ pauseCounselorDeletion: vi.fn() }));

describe('DeletionWindowModal late response', () => {
    it('does not close or toast over a newer modal when an earlier request settles', async () => {
        const deferred = Promise.withResolvers<void>();
        api.cancel.mockReturnValueOnce(deferred.promise);
        const client = new QueryClient();
        const closeFirst = vi.fn();
        const closeSecond = vi.fn();
        const wrap = (node: React.ReactNode) => <QueryClientProvider client={client}>{node}</QueryClientProvider>;

        const first = render(wrap(<DeletionWindowModal mode="cancel" consultantId="c-1" onClose={closeFirst} />));
        fireEvent.click(screen.getByRole('button', { name: 'deletionWindow.cancel.confirm' }));
        first.unmount();
        render(wrap(<DeletionWindowModal mode="pause" consultantId="c-2" onClose={closeSecond} />));

        await act(async () => deferred.resolve());

        expect(closeFirst).not.toHaveBeenCalled();
        expect(closeSecond).not.toHaveBeenCalled();
    });
});
