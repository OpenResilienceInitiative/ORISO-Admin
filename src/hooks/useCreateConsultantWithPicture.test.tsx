import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useCreateConsultantWithPicture } from './useCreateConsultantWithPicture';
import { useAddOrUpdateConsultantOrAdmin } from './useAddOrUpdateConsultantOrAgencyAdmin';
import { TypeOfUser } from '../enums/TypeOfUser';
import { CounselorData } from '../types/counselor';
import { uploadConsultantPicture } from '../api/counselor/consultantPicture';

const api = vi.hoisted(() => ({ add: vi.fn(), edit: vi.fn() }));
vi.mock('../api/counselor/addCounselorData', () => ({ addCounselorData: api.add }));
vi.mock('../api/counselor/editCounselorData', () => ({ editCounselorData: api.edit }));
vi.mock('../api/counselor/consultantPicture', () => ({ uploadConsultantPicture: vi.fn() }));
const deferred = <T,>() => {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((done) => {
        resolve = done;
    });
    return { promise, resolve };
};
const file = new File(['A'], 'A.png', { type: 'image/png' });
beforeEach(() => {
    vi.mocked(uploadConsultantPicture).mockReset();
    api.add.mockReset();
    api.edit.mockReset();
});

it('guards synchronous double submission, captures the file and remains committed after photo failure', async () => {
    const post = deferred<{ id: string }>();
    const put = deferred<Response>();
    const create = vi.fn(() => post.promise);
    const complete = vi.fn();
    vi.mocked(uploadConsultantPicture).mockReturnValue(put.promise);
    const { result } = renderHook(() => useCreateConsultantWithPicture('consultants/add'));
    let running!: Promise<void>;
    act(() => {
        running = result.current.createWithPicture(create, {}, file, complete);
        result.current.createWithPicture(create, {}, new File(['B'], 'B.png'), complete);
    });
    expect(create).toHaveBeenCalledTimes(1);
    expect(result.current.busy).toBe(true);
    await act(async () => {
        post.resolve({ id: 'created' });
    });
    expect(uploadConsultantPicture).toHaveBeenCalledWith('created', file);
    await act(async () => {
        await result.current.createWithPicture(create, {}, file, complete);
        put.resolve(new Response(null, { status: 204 }));
        await running;
    });
    await act(async () => {
        await result.current.createWithPicture(create, {}, file, complete);
    });
    expect(create).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledExactlyOnceWith('created', true);
});

it.each(['POST', 'PUT'])('does not navigate or start new work after unmount during %s', async (stage) => {
    const post = deferred<{ id: string }>();
    const put = deferred<Response>();
    const complete = vi.fn();
    vi.mocked(uploadConsultantPicture).mockReturnValue(put.promise);
    const { result, unmount } = renderHook(() => useCreateConsultantWithPicture('consultants/add'));
    let running!: Promise<void>;
    act(() => {
        running = result.current.createWithPicture(() => post.promise, {}, file, complete);
    });
    if (stage === 'PUT')
        await act(async () => {
            post.resolve({ id: 'created' });
        });
    unmount();
    await act(async () => {
        post.resolve({ id: 'created' });
        put.resolve(new Response(null, { status: 204 }));
        await running;
    });
    expect(complete).not.toHaveBeenCalled();
    expect(uploadConsultantPicture).toHaveBeenCalledTimes(stage === 'POST' ? 0 : 1);
});

it('disregards completion from the previous route while a different owner is mounted', async () => {
    const post = deferred<{ id: string }>();
    const complete = vi.fn();
    const { result, rerender } = renderHook(({ route }) => useCreateConsultantWithPicture(route), {
        initialProps: { route: 'consultants/add' },
    });
    let running!: Promise<void>;
    act(() => {
        running = result.current.createWithPicture(() => post.promise, {}, file, complete);
    });
    rerender({ route: 'consultants/another' });
    await act(async () => {
        post.resolve({ id: 'created' });
        await running;
    });
    expect(uploadConsultantPicture).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
    expect(result.current.busy).toBe(false);
});

it('reports partial account success and never replays POST after photo failure', async () => {
    vi.mocked(uploadConsultantPicture).mockRejectedValue(new Error('scanner down'));
    const create = vi.fn().mockResolvedValue({ id: 'committed' });
    const complete = vi.fn();
    const { result } = renderHook(() => useCreateConsultantWithPicture('consultants/add'));
    await act(async () => {
        await result.current.createWithPicture(create, {}, file, complete);
    });
    expect(complete).toHaveBeenCalledExactlyOnceWith('committed', false);
    await act(async () => {
        await result.current.createWithPicture(create, {}, file, complete);
    });
    expect(create).toHaveBeenCalledTimes(1);
});

it('preserves another account callback with the real mutation while the obsolete POST finishes last', async () => {
    const post = deferred<{ id: string }>();
    api.add.mockReturnValue(post.promise);
    api.edit.mockResolvedValue({ id: 'B' });
    const client = new QueryClient();
    const notified = vi.fn();
    const complete = vi.fn();
    const { result, rerender, unmount } = renderHook(
        ({ id }) => {
            const owner = useCreateConsultantWithPicture(`consultants/${id}`);
            const mutation = useAddOrUpdateConsultantOrAdmin({
                id: id === 'add' ? undefined : id,
                typeOfUser: TypeOfUser.Consultants,
                onSuccess: (data, variables) => {
                    if (!owner.ownsAccountSuccess(variables)) notified(data.id);
                },
            });
            return { owner, mutation };
        },
        {
            initialProps: { id: 'add' },
            wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
        },
    );
    const payload = { firstname: 'Ada' } as CounselorData;
    let creating!: Promise<void>;
    act(() => {
        creating = result.current.owner.createWithPicture(result.current.mutation.mutateAsync, payload, file, complete);
    });
    await waitFor(() => expect(api.add).toHaveBeenCalledTimes(1));
    rerender({ id: 'B' });
    await act(async () => {
        await result.current.mutation.mutateAsync({ ...payload, firstname: 'Grace' });
    });
    expect(api.edit).toHaveBeenCalledWith('B', expect.objectContaining({ firstname: 'Grace' }));
    expect(notified).toHaveBeenCalledExactlyOnceWith('B');
    await act(async () => {
        post.resolve({ id: 'A' });
        await creating;
    });
    expect(notified).toHaveBeenCalledExactlyOnceWith('B');
    expect(complete).not.toHaveBeenCalled();
    expect(uploadConsultantPicture).not.toHaveBeenCalled();
    unmount();
    client.clear();
});

it('unlocks after real account mutation failure and guards the successful no-photo retry', async () => {
    api.add.mockRejectedValueOnce(new Error('account failed')).mockResolvedValue({ id: 'created' });
    const client = new QueryClient();
    const complete = vi.fn();
    const { result, unmount } = renderHook(
        () => {
            const owner = useCreateConsultantWithPicture('consultants/add');
            const mutation = useAddOrUpdateConsultantOrAdmin({ typeOfUser: TypeOfUser.Consultants });
            return { owner, mutation };
        },
        { wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> },
    );
    const payload = { firstname: 'Ada' } as CounselorData;
    await act(async () => {
        await result.current.owner.createWithPicture(result.current.mutation.mutateAsync, payload, null, complete);
    });
    expect(result.current.owner.busy).toBe(false);
    await act(async () => {
        await result.current.owner.createWithPicture(result.current.mutation.mutateAsync, payload, null, complete);
    });
    expect(complete).toHaveBeenCalledExactlyOnceWith('created', true);
    await act(async () => {
        await result.current.owner.createWithPicture(result.current.mutation.mutateAsync, payload, null, complete);
    });
    expect(api.add).toHaveBeenCalledTimes(2);
    expect(uploadConsultantPicture).not.toHaveBeenCalled();
    unmount();
    client.clear();
});
