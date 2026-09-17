import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConsultantPictureControl } from './ConsultantPictureControl';

const mocks = vi.hoisted(() => ({
    realHooks: false,
    picture: {
        data: new Blob(['old-clean-image'], { type: 'image/png' }) as Blob | null | undefined,
        isPending: false,
        isError: false,
        error: null as Error | null,
    },
    upload: { mutateAsync: vi.fn(), isPending: false },
    remove: { mutateAsync: vi.fn(), isPending: false },
    publish: { mutateAsync: vi.fn(), isPending: false },
    // Issue #1049: the publish switch. `undefined` = not known yet, which reads as internal.
    visibility: { data: true as boolean | undefined, isPending: false, isError: false },
}));

const api = vi.hoisted(() => ({
    get: vi.fn(),
    upload: vi.fn(),
    remove: vi.fn(),
    getVisibility: vi.fn(),
    setVisibility: vi.fn(),
}));
vi.mock('../../../api/counselor/consultantPicture', () => ({
    getConsultantPicture: api.get,
    uploadConsultantPicture: api.upload,
    removeConsultantPicture: api.remove,
    getConsultantPictureVisibility: api.getVisibility,
    setConsultantPictureVisibility: api.setVisibility,
}));

// Exercise the installed QueryClient, independently of the presentation fixtures above.
const actualHooks = await vi.importActual<typeof import('../../../hooks/useConsultantPicture')>(
    '../../../hooks/useConsultantPicture',
);

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../hooks/useConsultantPicture', () => ({
    useConsultantPicture: (id: string) => (mocks.realHooks ? actualHooks.useConsultantPicture(id) : mocks.picture),
    useConsultantPictureMutations: (id: string) =>
        mocks.realHooks
            ? actualHooks.useConsultantPictureMutations(id)
            : { upload: mocks.upload, remove: mocks.remove, publish: mocks.publish },
    useConsultantPictureVisibility: (id: string, enabled?: boolean) =>
        mocks.realHooks ? actualHooks.useConsultantPictureVisibility(id, enabled) : mocks.visibility,
}));

describe('ConsultantPictureControl', () => {
    const createObjectURL = vi.fn();
    const revokeObjectURL = vi.fn();

    beforeEach(() => {
        mocks.realHooks = false;
        mocks.picture = {
            data: new Blob(['old-clean-image'], { type: 'image/png' }) as Blob | null | undefined,
            isPending: false,
            isError: false,
            error: null as Error | null,
        };
        mocks.upload.mutateAsync.mockReset();
        mocks.remove.mutateAsync.mockReset();
        mocks.publish.mutateAsync.mockReset();
        mocks.visibility = { data: true, isPending: false, isError: false };
        createObjectURL.mockReset();
        revokeObjectURL.mockReset();
        createObjectURL.mockImplementation(() => `blob:preview-${createObjectURL.mock.calls.length}`);
        vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    });

    afterEach(() => vi.unstubAllGlobals());

    it('keeps its heading and named region when used standalone', () => {
        render(<ConsultantPictureControl disabled={false} pendingDeletion={false} />);
        expect(screen.getAllByRole('heading', { name: 'counselor.picture.title' })).toHaveLength(1);
        expect(screen.getByRole('region', { name: 'counselor.picture.title' })).toBeInTheDocument();
    });

    it('keeps its region named when the containing Card supplies the heading', () => {
        render(<ConsultantPictureControl disabled={false} pendingDeletion={false} showHeading={false} />);
        expect(screen.queryByRole('heading', { name: 'counselor.picture.title' })).not.toBeInTheDocument();
        expect(screen.getByRole('region', { name: 'counselor.picture.title' })).toBeInTheDocument();
    });

    it.each(['upload', 'remove'] as const)(
        'reports a failed post-%s read, then recovers without repeating the write',
        async (action) => {
            mocks.realHooks = true;
            api.get
                .mockReset()
                .mockResolvedValueOnce(new Blob(['clean']))
                .mockRejectedValue(new Error('GET failed'));
            api[action].mockReset().mockResolvedValue(new Response(null, { status: 204 }));
            const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
            const user = userEvent.setup();
            const { unmount } = render(
                <QueryClientProvider client={client}>
                    <ConsultantPictureControl consultantId="42" disabled={false} pendingDeletion={false} />
                </QueryClientProvider>,
            );
            await screen.findByRole('img');
            if (action === 'upload') {
                await user.upload(
                    screen.getByLabelText('counselor.picture.choose'),
                    new File(['new'], 'new.png', { type: 'image/png' }),
                );
            }
            await user.click(screen.getByRole('button', { name: `counselor.picture.${action}` }));
            await waitFor(() =>
                expect(screen.getByRole('alert')).toHaveTextContent('counselor.picture.error.readFailed'),
            );
            expect(screen.queryByText('counselor.picture.status.saved')).not.toBeInTheDocument();
            expect(screen.queryByText('counselor.picture.empty')).not.toBeInTheDocument();
            expect(screen.queryByText('counselor.picture.error.unavailable')).not.toBeInTheDocument();
            expect(screen.queryByRole('img')).not.toBeInTheDocument();
            expect(screen.getByRole('alert')).not.toHaveAttribute('aria-live', 'polite');
            expect(screen.queryByText('counselor.picture.status.removed')).not.toBeInTheDocument();
            const fresh = action === 'upload' ? new Blob(['verified fresh']) : null;
            api.get.mockResolvedValue(fresh);
            await act(async () => {
                await client.invalidateQueries({ queryKey: ['CONSULTANT_PICTURE', '42'] });
            });
            await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
            expect(screen.getByRole('status')).toHaveTextContent(
                `counselor.picture.status.${action === 'upload' ? 'saved' : 'removed'}`,
            );
            if (action === 'upload') {
                expect(screen.getByRole('img')).toBeInTheDocument();
                expect(createObjectURL).toHaveBeenLastCalledWith(fresh);
            } else {
                expect(screen.queryByRole('img')).not.toBeInTheDocument();
                expect(screen.getByText('counselor.picture.empty')).toBeInTheDocument();
            }
            expect(api[action]).toHaveBeenCalledTimes(1);
            unmount();
            client.clear();
        },
    );

    it('shows only the fresh post-PUT image when Saved is announced despite a late initial GET', async () => {
        mocks.realHooks = true;
        const fresh = new Blob(['fresh']);
        const old = new Blob(['old']);
        let finish!: (value: Blob) => void;
        api.get
            .mockReset()
            .mockImplementationOnce(
                () =>
                    new Promise<Blob>((resolve) => {
                        finish = resolve;
                    }),
            )
            .mockResolvedValue(fresh);
        api.upload.mockReset().mockResolvedValue(new Response(null, { status: 204 }));
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const user = userEvent.setup();
        const { unmount } = render(
            <QueryClientProvider client={client}>
                <ConsultantPictureControl consultantId="42" disabled={false} pendingDeletion={false} />
            </QueryClientProvider>,
        );
        await user.upload(
            screen.getByLabelText('counselor.picture.choose'),
            new File(['fresh'], 'new.png', { type: 'image/png' }),
        );
        await user.click(screen.getByRole('button', { name: 'counselor.picture.upload' }));
        await act(async () => {
            finish(old);
        });
        await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('counselor.picture.status.saved'));
        expect(client.getQueryData(['CONSULTANT_PICTURE', '42'])).toBe(fresh);
        expect(createObjectURL).toHaveBeenLastCalledWith(fresh);
        expect(createObjectURL.mock.calls.some(([blob]) => blob === old)).toBe(false);
        unmount();
        client.clear();
    });

    it.each(['upload', 'remove'] as const)('locks conflicting actions synchronously during %s', async (action) => {
        const user = userEvent.setup();
        let finish!: () => void;
        mocks[action].mutateAsync.mockImplementation(
            () =>
                new Promise<void>((resolve) => {
                    finish = resolve;
                }),
        );
        const selected = vi.fn();
        render(
            <ConsultantPictureControl
                consultantId="42"
                disabled={false}
                pendingDeletion={false}
                onSelectedFileChange={selected}
            />,
        );
        const picker = screen.getByLabelText('counselor.picture.choose');
        const first = new File(['A'], 'A.png', { type: 'image/png' });
        if (action === 'upload') await user.upload(picker, first);
        const button = screen.getByRole('button', { name: `counselor.picture.${action}` });
        act(() => {
            fireEvent.click(button);
            fireEvent.click(button);
        });
        expect(mocks[action].mutateAsync).toHaveBeenCalledTimes(1);
        expect(picker).toBeDisabled();
        expect(screen.getByRole('button', { name: 'counselor.picture.choose' })).toBeDisabled();
        // Native/programmatic events must obey the same guard as disabled controls.
        fireEvent.change(picker, { target: { files: [new File(['B'], 'B.png', { type: 'image/png' })] } });
        expect(selected).toHaveBeenCalledTimes(action === 'upload' ? 1 : 0);
        await act(async () => {
            finish();
        });
        expect(screen.getByRole('button', { name: 'counselor.picture.choose' })).toBeEnabled();
    });

    it('does not clear a new owners selection when the previous owners upload finishes', async () => {
        const user = userEvent.setup();
        let finish!: () => void;
        mocks.upload.mutateAsync.mockImplementation(
            () =>
                new Promise<void>((resolve) => {
                    finish = resolve;
                }),
        );
        const selected = vi.fn();
        const { rerender } = render(
            <ConsultantPictureControl
                consultantId="42"
                disabled={false}
                pendingDeletion={false}
                onSelectedFileChange={selected}
            />,
        );
        await user.upload(
            screen.getByLabelText('counselor.picture.choose'),
            new File(['A'], 'A.png', { type: 'image/png' }),
        );
        await user.click(screen.getByRole('button', { name: 'counselor.picture.upload' }));
        rerender(
            <ConsultantPictureControl
                consultantId="43"
                disabled={false}
                pendingDeletion={false}
                onSelectedFileChange={selected}
            />,
        );
        const next = new File(['B'], 'B.png', { type: 'image/png' });
        await user.upload(screen.getByLabelText('counselor.picture.choose'), next);
        await act(async () => {
            finish();
        });
        expect(selected).toHaveBeenLastCalledWith(next);
        expect(screen.getByRole('button', { name: 'counselor.picture.upload' })).toBeEnabled();
        expect(screen.queryByText('counselor.picture.status.saved')).not.toBeInTheDocument();
    });

    it.each(['PICTURE_REJECTED', 'PICTURE_SCAN_UNAVAILABLE'])(
        'allows the same file to be selected again after %s',
        async (reason) => {
            const user = userEvent.setup();
            mocks.upload.mutateAsync.mockRejectedValue(new Response(JSON.stringify({ reason }), { status: 503 }));
            render(<ConsultantPictureControl consultantId="42" disabled={false} pendingDeletion={false} />);
            const picker = screen.getByLabelText('counselor.picture.choose');
            const file = new File(['A'], 'A.png', { type: 'image/png' });
            await user.upload(picker, file);
            await user.click(screen.getByRole('button', { name: 'counselor.picture.upload' }));
            await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
            expect(screen.getByRole('img')).toBeInTheDocument();
            await user.upload(picker, file);
            expect(screen.getByRole('button', { name: 'counselor.picture.upload' })).toBeEnabled();
        },
    );

    it('allows the same file to be selected after upload then removal', async () => {
        const user = userEvent.setup();
        mocks.upload.mutateAsync.mockResolvedValue(undefined);
        mocks.remove.mutateAsync.mockResolvedValue(undefined);
        render(<ConsultantPictureControl consultantId="42" disabled={false} pendingDeletion={false} />);
        const picker = screen.getByLabelText('counselor.picture.choose');
        const file = new File(['A'], 'A.png', { type: 'image/png' });
        await user.upload(picker, file);
        await user.click(screen.getByRole('button', { name: 'counselor.picture.upload' }));
        await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('saved'));
        expect(screen.getByRole('status')).not.toHaveAttribute('aria-live');
        await user.click(screen.getByRole('button', { name: 'counselor.picture.remove' }));
        await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('removed'));
        await user.upload(picker, file);
        expect(screen.getByRole('button', { name: 'counselor.picture.upload' })).toBeEnabled();
    });

    it.each([
        ['loading', null, 'counselor.picture.loading'],
        ['forbidden', new Error('NOT_ALLOWED'), 'counselor.picture.error.forbidden'],
        ['read failure', new Error('network failure'), 'counselor.picture.error.readFailed'],
    ])('distinguishes %s from a confirmed empty photo', (state, error, key) => {
        mocks.picture = {
            data: undefined,
            isPending: state === 'loading',
            isError: !!error,
            error: error as Error | null,
        };
        render(<ConsultantPictureControl consultantId="42" disabled={false} pendingDeletion={false} />);
        expect(screen.queryByText('counselor.picture.empty')).not.toBeInTheDocument();
        const feedback = screen.getByRole(state === 'loading' ? 'status' : 'alert');
        expect(feedback).toHaveTextContent(key as string);
        expect(feedback).not.toHaveAttribute('aria-live');
        expect(screen.queryByText('counselor.picture.error.unavailable')).not.toBeInTheDocument();
    });

    it('reports empty only for a confirmed missing photo or a new account', () => {
        mocks.picture.data = null;
        const { rerender } = render(
            <ConsultantPictureControl consultantId="42" disabled={false} pendingDeletion={false} />,
        );
        expect(screen.getByText('counselor.picture.empty')).toBeInTheDocument();
        mocks.picture = { data: undefined, isPending: true, isError: false, error: null };
        rerender(<ConsultantPictureControl disabled={false} pendingDeletion={false} />);
        expect(screen.getByText('counselor.picture.empty')).toBeInTheDocument();
        expect(screen.queryByText('counselor.picture.loading')).not.toBeInTheDocument();
    });

    it('offers only the visible chooser in keyboard order and opens it with Enter and Space', async () => {
        const user = userEvent.setup();
        render(<ConsultantPictureControl disabled={false} pendingDeletion={false} />);
        const picker = screen.getByLabelText('counselor.picture.choose');
        const choose = screen.getByRole('button', { name: 'counselor.picture.choose' });
        const click = vi.spyOn(picker, 'click');
        await user.tab();
        expect(choose).toHaveFocus();
        await user.keyboard('{Enter}');
        await user.keyboard(' ');
        expect(click).toHaveBeenCalledTimes(2);
        expect(picker).not.toBeVisible();
    });

    it.each(['success', 'failure', 'removal'])('restores focus to the visible chooser after %s', async (outcome) => {
        const user = userEvent.setup();
        mocks.upload.mutateAsync.mockImplementation(async () => {
            if (outcome === 'failure') throw new Error('network failure');
        });
        mocks.remove.mutateAsync.mockResolvedValue(undefined);
        render(<ConsultantPictureControl consultantId="42" disabled={false} pendingDeletion={false} />);
        if (outcome !== 'removal') {
            await user.upload(
                screen.getByLabelText('counselor.picture.choose'),
                new File(['A'], 'A.png', { type: 'image/png' }),
            );
        }
        await user.click(
            screen.getByRole('button', { name: `counselor.picture.${outcome === 'removal' ? 'remove' : 'upload'}` }),
        );
        await waitFor(() => expect(screen.getByRole('button', { name: 'counselor.picture.choose' })).toHaveFocus());
    });

    it.each([
        [400, 'PICTURE_INVALID_IMAGE', 'invalidImage'],
        [413, 'PICTURE_TOO_LARGE', 'tooLarge'],
        [415, 'PICTURE_UNSUPPORTED_TYPE', 'unsupportedType'],
        [422, 'PICTURE_REJECTED', 'rejected'],
        [503, 'PICTURE_SCAN_UNAVAILABLE', 'unavailable'],
        [500, 'UNKNOWN_REASON', 'failed'],
    ])('status %s maps %s to visible error %s', async (status, reason, key) => {
        const user = userEvent.setup();
        mocks.upload.mutateAsync.mockRejectedValue(
            new Response(JSON.stringify({ reason }), { status: status as number }),
        );
        render(<ConsultantPictureControl consultantId="42" disabled={false} pendingDeletion={false} />);
        await user.upload(
            screen.getByLabelText('counselor.picture.choose'),
            new File(['x'], 'x.png', { type: 'image/png' }),
        );
        await user.click(screen.getByRole('button', { name: 'counselor.picture.upload' }));
        await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(`counselor.picture.error.${key}`));
        expect(screen.queryByText('counselor.picture.status.saved')).toBeNull();
    });
    it.each(['type', 'size'])('invalid %s is rejected before request', async (kind) => {
        const user = userEvent.setup({ applyAccept: false });
        render(<ConsultantPictureControl consultantId="42" disabled={false} pendingDeletion={false} />);
        const file =
            kind === 'type'
                ? new File(['x'], 'x.txt', { type: 'text/plain' })
                : new File([new Uint8Array(5242881)], 'big.png', { type: 'image/png' });
        await user.upload(screen.getByLabelText('counselor.picture.choose'), file);
        expect(screen.getByRole('alert')).toHaveTextContent(kind === 'type' ? 'unsupportedType' : 'tooLarge');
        expect(mocks.upload.mutateAsync).not.toHaveBeenCalled();
    });
    it('read-only disables selection and removal', () => {
        render(<ConsultantPictureControl consultantId="42" disabled pendingDeletion={false} />);
        expect(screen.getByLabelText('counselor.picture.choose')).toBeDisabled();
        expect(screen.getByRole('button', { name: 'counselor.picture.remove' })).toBeDisabled();
    });
    it('failed delete retains server preview without reporting removed', async () => {
        mocks.remove.mutateAsync.mockRejectedValue(new Error('network failure'));
        const user = userEvent.setup();
        render(<ConsultantPictureControl consultantId="42" disabled={false} pendingDeletion={false} />);
        const src = screen.getByRole('img').getAttribute('src');
        await user.click(screen.getByRole('button', { name: 'counselor.picture.remove' }));
        await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
        expect(screen.getByRole('img')).toHaveAttribute('src', src);
        expect(screen.queryByText('counselor.picture.status.removed')).toBeNull();
    });
    it('keeps the existing clean preview when a replacement is rejected and revokes object URLs', async () => {
        const user = userEvent.setup();
        mocks.upload.mutateAsync.mockRejectedValue(
            new Response(JSON.stringify({ reason: 'PICTURE_REJECTED' }), { status: 422 }),
        );
        const { unmount } = render(
            <ConsultantPictureControl consultantId="42" disabled={false} pendingDeletion={false} />,
        );

        const picker = screen.getByLabelText('counselor.picture.choose');
        const candidate = new File(['candidate'], 'candidate.png', { type: 'image/png' });
        await user.upload(picker, candidate);
        await user.click(screen.getByRole('button', { name: 'counselor.picture.upload' }));

        await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('counselor.picture.error.rejected'));
        expect(createObjectURL).toHaveBeenLastCalledWith(mocks.picture.data);
        const currentUrl = screen.getByRole('img').getAttribute('src');
        expect(currentUrl).toBeTruthy();
        revokeObjectURL.mockClear();

        unmount();
        expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith(currentUrl);
    });

    it('does not expose an upload control for a new account but hands its chosen file to the create form', async () => {
        const user = userEvent.setup();
        const onSelectedFileChange = vi.fn();
        render(
            <ConsultantPictureControl
                disabled={false}
                pendingDeletion={false}
                onSelectedFileChange={onSelectedFileChange}
            />,
        );

        await user.upload(
            screen.getByLabelText('counselor.picture.choose'),
            new File(['candidate'], 'candidate.jpeg', { type: 'image/jpeg' }),
        );

        expect(onSelectedFileChange).toHaveBeenCalledWith(expect.any(File));
        expect(screen.queryByRole('button', { name: 'counselor.picture.upload' })).toBeNull();
    });

    it('locks selection and removal when the consultant is pending deletion', () => {
        render(<ConsultantPictureControl consultantId="42" disabled={false} pendingDeletion />);

        expect(screen.getByLabelText('counselor.picture.choose')).toBeDisabled();
        expect(screen.getByRole('button', { name: 'counselor.picture.remove' })).toBeDisabled();
        expect(screen.getByRole('status')).toHaveTextContent('counselor.picture.deleting');
    });
    describe('#1049 publish switch', () => {
        const switchName = 'counselor.picture.visibility.label';

        it('offers no switch until a stored picture exists', () => {
            mocks.picture = { data: null, isPending: false, isError: false, error: null };
            const { rerender } = render(
                <ConsultantPictureControl consultantId="42" disabled={false} pendingDeletion={false} />,
            );
            expect(screen.queryByRole('switch', { name: switchName })).not.toBeInTheDocument();

            mocks.picture = {
                data: new Blob(['clean'], { type: 'image/png' }),
                isPending: false,
                isError: false,
                error: null,
            };
            rerender(<ConsultantPictureControl consultantId="42" disabled={false} pendingDeletion={false} />);
            expect(screen.getByRole('switch', { name: switchName })).toBeInTheDocument();
        });

        it('shows the picture as internal while the stored decision is unknown', () => {
            mocks.visibility = { data: undefined, isPending: true, isError: false };
            render(<ConsultantPictureControl consultantId="42" disabled={false} pendingDeletion={false} />);
            const toggle = screen.getByRole('switch', { name: switchName });
            expect(toggle).not.toBeChecked();
            expect(toggle).toBeDisabled();
            expect(screen.getByText('counselor.picture.visibility.internalHint')).toBeInTheDocument();
        });

        it('publishes and withdraws, writing the inverse flag each time', async () => {
            const user = userEvent.setup();
            mocks.publish.mutateAsync.mockResolvedValue(undefined);
            const { rerender } = render(
                <ConsultantPictureControl consultantId="42" disabled={false} pendingDeletion={false} />,
            );
            await user.click(screen.getByRole('switch', { name: switchName }));
            await waitFor(() => expect(mocks.publish.mutateAsync).toHaveBeenCalledWith(false));
            expect(await screen.findByText('counselor.picture.status.published')).toBeInTheDocument();

            mocks.visibility = { data: false, isPending: false, isError: false };
            rerender(<ConsultantPictureControl consultantId="42" disabled={false} pendingDeletion={false} />);
            expect(screen.getByRole('switch', { name: switchName })).toBeChecked();
            expect(screen.getByText('counselor.picture.visibility.publicHint')).toBeInTheDocument();

            await user.click(screen.getByRole('switch', { name: switchName }));
            await waitFor(() => expect(mocks.publish.mutateAsync).toHaveBeenLastCalledWith(true));
            expect(await screen.findByText('counselor.picture.status.withdrawn')).toBeInTheDocument();
        });

        it('reports a refused change as an alert and never as a stored state', async () => {
            const user = userEvent.setup();
            mocks.publish.mutateAsync.mockRejectedValue(new Error('nope'));
            render(<ConsultantPictureControl consultantId="42" disabled={false} pendingDeletion={false} />);
            await user.click(screen.getByRole('switch', { name: switchName }));
            await waitFor(() =>
                expect(screen.getByRole('alert')).toHaveTextContent('counselor.picture.error.visibilityFailed'),
            );
            expect(screen.queryByText('counselor.picture.status.published')).not.toBeInTheDocument();
        });

        it('locks the switch for a read-only form and a person pending deletion', () => {
            const { rerender } = render(
                <ConsultantPictureControl consultantId="42" disabled pendingDeletion={false} />,
            );
            expect(screen.getByRole('switch', { name: switchName })).toBeDisabled();
            rerender(<ConsultantPictureControl consultantId="42" disabled={false} pendingDeletion />);
            expect(screen.getByRole('switch', { name: switchName })).toBeDisabled();
        });
    });
});

describe('picture reads across mutation boundaries', () => {
    it.each(['upload', 'remove'] as const)(
        'keeps a successful %s successful after GET failure, invalidates both records and recovers',
        async (action) => {
            const old = new Blob(['old']);
            const fresh = action === 'upload' ? new Blob(['fresh']) : null;
            const failure = new Error('refresh unavailable');
            api.get.mockReset().mockResolvedValueOnce(old).mockRejectedValue(failure);
            api[action].mockReset().mockResolvedValue(undefined);
            const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
            client.setQueryData(['CONSULTANT', '42'], { id: '42' });
            client.setQueryData(['CONSULTANTS'], [{ id: '42' }]);
            client.setQueryData(['CONSULTANT', '43'], { id: '43' });
            const wrapper = ({ children }: { children: React.ReactNode }) => (
                <QueryClientProvider client={client}>{children}</QueryClientProvider>
            );
            const { result, unmount } = renderHook(
                () => ({
                    picture: actualHooks.useConsultantPicture('42'),
                    mutations: actualHooks.useConsultantPictureMutations('42'),
                }),
                { wrapper },
            );
            await waitFor(() => expect(result.current.picture.data).toBe(old));
            let outcome: unknown;
            await act(async () => {
                const operation =
                    action === 'upload'
                        ? result.current.mutations.upload.mutateAsync(new File(['new'], 'new.png'))
                        : result.current.mutations.remove.mutateAsync();
                outcome = await operation.then(
                    () => 'success',
                    (error) => error,
                );
            });
            expect.soft(outcome).toBe('success');
            expect.soft(client.getMutationCache().getAll().at(-1)?.state.status).toBe('success');
            expect.soft(client.getQueryState(['CONSULTANT', '42'])?.isInvalidated).toBe(true);
            expect.soft(client.getQueryState(['CONSULTANTS'])?.isInvalidated).toBe(true);
            expect(client.getQueryState(['CONSULTANT', '43'])?.isInvalidated).toBe(false);
            await waitFor(() => expect(result.current.picture.error).toBe(failure));
            expect(result.current.picture.data).toBe(action === 'remove' ? null : old);
            expect(api.get).toHaveBeenCalledTimes(2);
            expect(api[action]).toHaveBeenCalledTimes(1);
            api.get.mockResolvedValue(fresh);
            await act(async () => {
                await result.current.picture.refetch();
            });
            await waitFor(() => expect(result.current.picture.isSuccess).toBe(true));
            expect(result.current.picture.data).toBe(fresh);
            expect(result.current.picture.error).toBeNull();
            expect(api[action]).toHaveBeenCalledTimes(1);
            unmount();
            client.clear();
        },
    );

    it('does not turn a completed write into a refusal when changing owner cancels its freshness GET', async () => {
        const old = new Blob(['old']);
        const other = new Blob(['other owner']);
        let finish!: (value: Blob) => void;
        api.get
            .mockReset()
            .mockResolvedValueOnce(old)
            .mockImplementationOnce(
                () =>
                    new Promise<Blob>((resolve) => {
                        finish = resolve;
                    }),
            )
            .mockResolvedValue(other);
        api.upload.mockReset().mockResolvedValue(undefined);
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
        );
        const { result, rerender, unmount } = renderHook(
            ({ id }) => ({
                picture: actualHooks.useConsultantPicture(id),
                mutations: actualHooks.useConsultantPictureMutations(id),
            }),
            { wrapper, initialProps: { id: '42' } },
        );
        await waitFor(() => expect(result.current.picture.data).toBe(old));
        let operation!: Promise<unknown>;
        act(() => {
            operation = result.current.mutations.upload.mutateAsync(new File(['new'], 'new.png')).then(
                () => 'success',
                (error) => error,
            );
        });
        await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
        const signal = api.get.mock.calls[1][1] as AbortSignal;
        rerender({ id: '43' });
        expect(signal.aborted).toBe(true);
        await act(async () => {
            finish(new Blob(['late owner 42']));
            expect(await operation).toBe('success');
        });
        await waitFor(() => expect(result.current.picture.data).toBe(other));
        expect(result.current.picture.error).toBeNull();
        expect(client.getQueryData(['CONSULTANT_PICTURE', '42'])).toBe(old);
        unmount();
        client.clear();
    });

    it('attempts both record invalidations and does not swallow a failure outside the picture read', async () => {
        api.get.mockReset().mockResolvedValue(null);
        api.upload.mockReset().mockResolvedValue(undefined);
        const client = new QueryClient();
        client.setQueryData(['CONSULTANTS'], []);
        const failure = new Error('unexpected invalidation failure');
        const invalidate = client.invalidateQueries.bind(client);
        const spy = vi.spyOn(client, 'invalidateQueries').mockImplementation((filters) => {
            if (filters?.queryKey?.[0] === 'CONSULTANT') return Promise.reject(failure);
            return invalidate(filters);
        });
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
        );
        const { result, unmount } = renderHook(() => actualHooks.useConsultantPictureMutations('42'), { wrapper });
        await act(async () => {
            await expect(result.current.upload.mutateAsync(new File(['new'], 'new.png'))).rejects.toBe(failure);
        });
        expect(spy).toHaveBeenCalledWith({ queryKey: ['CONSULTANTS'] });
        expect(client.getQueryState(['CONSULTANTS'])?.isInvalidated).toBe(true);
        unmount();
        client.clear();
    });

    it('aborts an obsolete owner GET and never exposes its bytes on the new owner', async () => {
        let finish!: (value: Blob) => void;
        const other = new Blob(['43']);
        api.get
            .mockReset()
            .mockImplementationOnce(
                () =>
                    new Promise<Blob>((resolve) => {
                        finish = resolve;
                    }),
            )
            .mockResolvedValue(other);
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
        );
        const { result, rerender, unmount } = renderHook(({ id }) => actualHooks.useConsultantPicture(id), {
            wrapper,
            initialProps: { id: '42' },
        });
        await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));
        const signal = api.get.mock.calls[0][1] as AbortSignal;
        rerender({ id: '43' });
        expect(signal.aborted).toBe(true);
        await act(async () => {
            finish(new Blob(['obsolete']));
        });
        await waitFor(() => expect(result.current.data).toBe(other));
        expect(client.getQueryData(['CONSULTANT_PICTURE', '42'])).toBeUndefined();
        unmount();
        client.clear();
    });

    it('restores the server read when upload fails after cancelling the initial GET', async () => {
        const old = new Blob(['previous clean image']);
        api.get
            .mockReset()
            .mockImplementationOnce(() => new Promise(() => {}))
            .mockResolvedValue(old);
        api.upload.mockReset().mockRejectedValue(new Error('scanner unavailable'));
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
        );
        const { result, unmount } = renderHook(
            () => ({
                picture: actualHooks.useConsultantPicture('42'),
                mutations: actualHooks.useConsultantPictureMutations('42'),
            }),
            { wrapper },
        );
        await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));
        await act(async () => {
            await expect(result.current.mutations.upload.mutateAsync(new File(['new'], 'new.png'))).rejects.toThrow(
                'scanner unavailable',
            );
        });
        await waitFor(() => expect(result.current.picture.data).toBe(old));
        unmount();
        client.clear();
    });

    it.each([false, true])(
        'isolates the mutation owner when the route changes and refresh fails=%s',
        async (readFails) => {
            const old = new Blob(['old42']);
            const fresh = new Blob(['new42']);
            const other = new Blob(['43']);
            let saved = false;
            const failure = new Error('owner 42 refresh failed');
            let finish!: () => void;
            api.get.mockReset().mockImplementation(async (id: string) => {
                if (id !== '42') return other;
                if (saved && readFails) throw failure;
                return saved ? fresh : old;
            });
            api.upload.mockReset().mockImplementation(
                () =>
                    new Promise<void>((resolve) => {
                        finish = resolve;
                    }),
            );
            const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
            const wrapper = ({ children }: { children: React.ReactNode }) => (
                <QueryClientProvider client={client}>{children}</QueryClientProvider>
            );
            const { result, rerender, unmount } = renderHook(
                ({ id }) => ({
                    picture: actualHooks.useConsultantPicture(id),
                    mutations: actualHooks.useConsultantPictureMutations(id),
                }),
                { wrapper, initialProps: { id: '42' } },
            );
            await waitFor(() => expect(result.current.picture.data).toBe(old));
            let operation!: Promise<unknown>;
            act(() => {
                operation = result.current.mutations.upload.mutateAsync(new File(['new'], 'new.png'));
            });
            await waitFor(() => expect(api.upload).toHaveBeenCalledTimes(1));
            rerender({ id: '43' });
            await waitFor(() => expect(result.current.picture.data).toBe(other));
            await act(async () => {
                saved = true;
                finish();
                await operation;
            });
            expect(client.getQueryData(['CONSULTANT_PICTURE', '42'])).toBe(readFails ? old : fresh);
            expect(client.getQueryState(['CONSULTANT_PICTURE', '42'])?.error).toBe(readFails ? failure : null);
            expect(result.current.picture.data).toBe(other);
            expect(result.current.picture.error).toBeNull();
            unmount();
            client.clear();
        },
    );

    it.each(['upload', 'remove'] as const)(
        'discards a pending initial GET and reads fresh bytes after %s',
        async (action) => {
            let finishOld!: (blob: Blob) => void;
            const old = new Blob(['old']);
            const fresh = action === 'upload' ? new Blob(['fresh']) : null;
            api.get
                .mockReset()
                .mockImplementationOnce(
                    () =>
                        new Promise<Blob>((resolve) => {
                            finishOld = resolve;
                        }),
                )
                .mockResolvedValue(fresh);
            api.upload.mockResolvedValue(new Response(null, { status: 204 }));
            api.remove.mockResolvedValue(new Response(null, { status: 204 }));
            const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
            const wrapper = ({ children }: { children: React.ReactNode }) => (
                <QueryClientProvider client={client}>{children}</QueryClientProvider>
            );
            const { result, unmount } = renderHook(
                () => ({
                    picture: actualHooks.useConsultantPicture('42'),
                    mutations: actualHooks.useConsultantPictureMutations('42'),
                }),
                { wrapper },
            );
            await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));
            let operation!: Promise<unknown>;
            act(() => {
                operation =
                    action === 'upload'
                        ? result.current.mutations.upload.mutateAsync(new File(['fresh'], 'fresh.png'))
                        : result.current.mutations.remove.mutateAsync();
            });
            await waitFor(() => expect(api[action]).toHaveBeenCalled());
            expect(api.get.mock.calls[0][1].aborted).toBe(true);
            await act(async () => {
                finishOld(old);
                await operation;
            });
            await waitFor(() => expect(result.current.picture.data).toBe(fresh));
            expect(client.getQueryData(['CONSULTANT_PICTURE', '42'])).toBe(fresh);
            unmount();
            client.clear();
        },
    );
});
