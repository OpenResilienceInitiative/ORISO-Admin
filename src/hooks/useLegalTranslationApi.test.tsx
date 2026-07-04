import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../api/tenant/translation', () => ({
    getTranslationKeys: vi.fn(),
    setTranslationKey: vi.fn(),
    translateLegalTexts: vi.fn(),
}));

// eslint-disable-next-line import/first
import { useTranslationKeys, TRANSLATION_KEYS_KEY } from './useTranslationKeys.hook';
// eslint-disable-next-line import/first
import { useSetTranslationKey } from './useSetTranslationKey.hook';
// eslint-disable-next-line import/first
import { useTranslateLegalContent } from './useTranslateLegalContent.hook';
// eslint-disable-next-line import/first
import { getTranslationKeys, setTranslationKey, translateLegalTexts } from '../api/tenant/translation';

const getKeysMock = vi.mocked(getTranslationKeys);
const setKeyMock = vi.mocked(setTranslationKey);
const translateMock = vi.mocked(translateLegalTexts);

beforeEach(() => {
    getKeysMock.mockReset();
    setKeyMock.mockReset();
    translateMock.mockReset();
});

const renderWithClient = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateQueries = vi.spyOn(client, 'invalidateQueries');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return { wrapper, invalidateQueries };
};

describe('useTranslationKeys', () => {
    it('loads the masked keys when enabled', async () => {
        getKeysMock.mockResolvedValue({ openrouter: 'sk-…abcd' });
        const { wrapper } = renderWithClient();
        const { result } = renderHook(() => useTranslationKeys(true), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual({ openrouter: 'sk-…abcd' });
    });

    it('does not call the superadmin endpoint when disabled', () => {
        const { wrapper } = renderWithClient();
        renderHook(() => useTranslationKeys(false), { wrapper });
        expect(getKeysMock).not.toHaveBeenCalled();
    });
});

describe('useSetTranslationKey', () => {
    it('saves the key and refreshes the masked key list', async () => {
        setKeyMock.mockResolvedValue({});
        const { wrapper, invalidateQueries } = renderWithClient();
        const { result } = renderHook(() => useSetTranslationKey(), { wrapper });

        result.current.mutate({ provider: 'mistral', apiKey: 'sk-new' });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(setKeyMock).toHaveBeenCalledWith('mistral', 'sk-new');
        expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: [TRANSLATION_KEYS_KEY] });
    });
});

describe('useTranslateLegalContent', () => {
    it('passes the request through and resolves with the translations', async () => {
        const response = { translations: { en: { content: '<p>Hi</p>' } }, provider: 'openrouter', model: 'm' };
        translateMock.mockResolvedValue(response);
        const { wrapper } = renderWithClient();
        const { result } = renderHook(() => useTranslateLegalContent(), { wrapper });

        const request = { sourceLang: 'de', targetLangs: ['en'], texts: { content: '<p>Hallo</p>' } };
        await expect(result.current.translate(request)).resolves.toEqual(response);
        expect(translateMock).toHaveBeenCalledWith(request);
    });
});
