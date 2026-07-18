import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n';

const mocks = vi.hoisted(() => ({
    uploadTenantMedia: vi.fn(),
    notificationError: vi.fn(),
}));

vi.mock('../../api/tenant/uploadTenantMedia', () => ({
    uploadTenantMedia: mocks.uploadTenantMedia,
}));
vi.mock('antd', async () => {
    const actual = await vi.importActual<typeof import('antd')>('antd');
    return {
        ...actual,
        notification: { ...actual.notification, error: mocks.notificationError },
    };
});

import { imageFilesFrom, useEditorImageUpload } from './useEditorImageUpload';

const makeEditor = () => {
    const run = vi.fn();
    const setImage = vi.fn(() => ({ run }));
    const focus = vi.fn(() => ({ setImage }));
    const chain = vi.fn(() => ({ focus }));
    return { editor: { chain } as any, setImage, run };
};

const file = (name: string, type: string, bytes = 8) => new File([new Uint8Array(bytes)], name, { type });

describe('useEditorImageUpload', () => {
    beforeEach(() => {
        mocks.uploadTenantMedia.mockReset();
        mocks.notificationError.mockReset();
    });

    it('uploads a supported image and inserts the served url into the editor', async () => {
        mocks.uploadTenantMedia.mockResolvedValue({ id: 'abc', url: '/media/abc', contentType: 'image/png' });
        const { editor, setImage, run } = makeEditor();
        const { result } = renderHook(() => useEditorImageUpload(() => editor));

        await act(() => result.current.uploadAndInsert([file('logo.png', 'image/png')]));

        expect(mocks.uploadTenantMedia).toHaveBeenCalledTimes(1);
        expect(setImage).toHaveBeenCalledWith({ src: '/media/abc' });
        expect(run).toHaveBeenCalled();
        expect(mocks.notificationError).not.toHaveBeenCalled();
    });

    it('rejects unsupported types client-side without calling the backend', async () => {
        const { editor, setImage } = makeEditor();
        const { result } = renderHook(() => useEditorImageUpload(() => editor));

        await act(() => result.current.uploadAndInsert([file('vector.svg', 'image/svg+xml')]));

        expect(mocks.uploadTenantMedia).not.toHaveBeenCalled();
        expect(setImage).not.toHaveBeenCalled();
        expect(mocks.notificationError).toHaveBeenCalledTimes(1);
    });

    it('rejects files over the 2 MB limit client-side', async () => {
        const { editor } = makeEditor();
        const { result } = renderHook(() => useEditorImageUpload(() => editor));
        const big = file('big.png', 'image/png', 2 * 1024 * 1024 + 1);

        await act(() => result.current.uploadAndInsert([big]));

        expect(mocks.uploadTenantMedia).not.toHaveBeenCalled();
        expect(mocks.notificationError).toHaveBeenCalledTimes(1);
    });

    it('shows an error notification when the upload fails', async () => {
        mocks.uploadTenantMedia.mockRejectedValue(new Error('boom'));
        const { editor, setImage } = makeEditor();
        const { result } = renderHook(() => useEditorImageUpload(() => editor));

        await act(() => result.current.uploadAndInsert([file('logo.png', 'image/png')]));

        expect(setImage).not.toHaveBeenCalled();
        expect(mocks.notificationError).toHaveBeenCalledTimes(1);
    });
});

describe('imageFilesFrom', () => {
    it('extracts only image files from a file list', () => {
        const files = [file('a.png', 'image/png'), file('b.txt', 'text/plain'), file('c.webp', 'image/webp')];
        const list = { length: files.length, 0: files[0], 1: files[1], 2: files[2] } as unknown as FileList;

        expect(imageFilesFrom(list).map((f) => f.name)).toEqual(['a.png', 'c.webp']);
    });

    it('returns an empty array for undefined input', () => {
        expect(imageFilesFrom(undefined)).toEqual([]);
    });
});
