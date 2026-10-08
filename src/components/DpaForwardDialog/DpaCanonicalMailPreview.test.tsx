import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DpaCanonicalMailPreview } from './DpaCanonicalMailPreview';
import type { DpaMailPreview } from '../../api/tenantOnboarding/dpaMailPreview';

const mocks = vi.hoisted(() => ({
    getAdminDpaMailPreview: vi.fn(),
    getPublicDpaMailPreview: vi.fn(),
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../../api/tenantOnboarding/dpaMailPreview', () => ({
    getAdminDpaMailPreview: mocks.getAdminDpaMailPreview,
    getPublicDpaMailPreview: mocks.getPublicDpaMailPreview,
}));

const deferred = () => {
    let resolve!: (preview: DpaMailPreview) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<DpaMailPreview>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, reject, resolve };
};

const preview = (name: string): DpaMailPreview => ({
    subject: `${name} subject`,
    html: `<html><body>${name} mail</body></html>`,
});

beforeEach(() => {
    mocks.getAdminDpaMailPreview.mockReset();
    mocks.getPublicDpaMailPreview.mockReset();
});

describe('DpaCanonicalMailPreview', () => {
    it('announces loading before the initial preview resolves', () => {
        mocks.getPublicDpaMailPreview.mockReturnValue(new Promise(() => {}));

        render(<DpaCanonicalMailPreview previewLabel="Mail preview" surface="public" inviteToken="token-a" />);

        expect(screen.getByTestId('dpa-forward-preview-loading')).toHaveTextContent('dpaForward.dialog.previewLoading');
        expect(screen.queryByTitle('Mail preview')).not.toBeInTheDocument();
    });

    it('never renders a late response from an earlier context', async () => {
        const first = deferred();
        const second = deferred();
        mocks.getPublicDpaMailPreview.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

        const { rerender } = render(
            <DpaCanonicalMailPreview previewLabel="Mail preview" surface="public" inviteToken="token-a" />,
        );
        await waitFor(() => expect(mocks.getPublicDpaMailPreview).toHaveBeenCalledWith('token-a'));

        rerender(<DpaCanonicalMailPreview previewLabel="Mail preview" surface="public" inviteToken="token-b" />);
        expect(screen.queryByTitle('Mail preview')).not.toBeInTheDocument();

        await act(async () => first.resolve(preview('old')));
        expect(screen.queryByTitle('Mail preview')).not.toBeInTheDocument();

        await act(async () => second.resolve(preview('new')));
        expect(await screen.findByTitle('Mail preview')).toHaveAttribute('srcdoc', preview('new').html);
        expect(screen.getByText('new subject')).toBeInTheDocument();
    });

    it('keeps the last valid document when a retry for the same context fails', async () => {
        const otherContext = deferred();
        const retry = deferred();
        mocks.getAdminDpaMailPreview
            .mockResolvedValueOnce(preview('tenant 42'))
            .mockReturnValueOnce(otherContext.promise)
            .mockReturnValueOnce(retry.promise);

        const { rerender } = render(
            <DpaCanonicalMailPreview previewLabel="Mail preview" surface="admin" tenantId={42} />,
        );
        await screen.findByTitle('Mail preview');

        rerender(<DpaCanonicalMailPreview previewLabel="Mail preview" surface="admin" tenantId={7} />);
        expect(screen.queryByTitle('Mail preview')).not.toBeInTheDocument();

        rerender(<DpaCanonicalMailPreview previewLabel="Mail preview" surface="admin" tenantId={42} />);

        expect(screen.getByTestId('dpa-forward-preview-loading')).toBeInTheDocument();
        expect(screen.getByTitle('Mail preview')).toHaveAttribute('srcdoc', preview('tenant 42').html);
        await waitFor(() => expect(mocks.getAdminDpaMailPreview).toHaveBeenCalledTimes(3));

        await act(async () => retry.reject(new Error('preview failed')));
        expect(await screen.findByTestId('dpa-forward-preview-error')).toBeInTheDocument();
        expect(screen.getByTitle('Mail preview')).toHaveAttribute('srcdoc', preview('tenant 42').html);
    });

    it.each([
        ['public', undefined, undefined],
        ['admin', undefined, undefined],
        ['admin', undefined, 0],
    ] as const)('does not request a preview when the %s context is missing', async (surface, inviteToken, tenantId) => {
        render(
            <DpaCanonicalMailPreview
                previewLabel="Mail preview"
                surface={surface}
                inviteToken={inviteToken}
                tenantId={tenantId}
            />,
        );

        expect(await screen.findByTestId('dpa-forward-preview-error')).toBeInTheDocument();
        expect(mocks.getPublicDpaMailPreview).not.toHaveBeenCalled();
        expect(mocks.getAdminDpaMailPreview).not.toHaveBeenCalled();
    });
});
