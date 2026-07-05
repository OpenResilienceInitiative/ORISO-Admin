import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../fetchData', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../fetchData')>();
    return { ...actual, fetchData: vi.fn() };
});

import updateTopicData from './updateTopicData';
import { fetchData, FETCH_METHODS } from '../fetchData';
import { topicEndpoint } from '../../appConfig';

const fetchMock = vi.mocked(fetchData);

beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(undefined);
});

const form = (status: boolean) =>
    ({ name: 'Sucht', description: 'desc', internalIdentifier: 'int-1', status } as never);

describe('updateTopicData', () => {
    it('rejects when the topic id is missing', async () => {
        await expect(updateTopicData(null as never, form(true))).rejects.toThrow('topic id must be set');
    });

    it('PUTs to the topic id endpoint and maps an enabled status to ACTIVE', async () => {
        await updateTopicData('5', form(true));

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const call = fetchMock.mock.calls[0][0];
        expect(call).toMatchObject({ url: `${topicEndpoint}/5`, method: FETCH_METHODS.PUT, skipAuth: false });
        expect(JSON.parse(call.bodyData as string)).toMatchObject({
            name: 'Sucht',
            description: 'desc',
            internalIdentifier: 'int-1',
            status: 'ACTIVE',
            external: false,
        });
    });

    it('maps a disabled status to INACTIVE', async () => {
        await updateTopicData('5', form(false));

        const call = fetchMock.mock.calls[0][0];
        expect(JSON.parse(call.bodyData as string)).toMatchObject({ status: 'INACTIVE' });
    });
});
