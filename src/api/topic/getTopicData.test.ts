import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../fetchData', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../fetchData')>();
    return { ...actual, fetchData: vi.fn() };
});

import getTopicData from './getTopicData';
import { fetchData } from '../fetchData';
import { topicAdminEndpoint } from '../../appConfig';

const fetchMock = vi.mocked(fetchData);

beforeEach(() => fetchMock.mockReset());

describe('getTopicData', () => {
    it('uppercases sort/order and builds the paged URL', async () => {
        fetchMock.mockResolvedValue([]);

        await getTopicData({ current: 2, pageSize: 20, sortBy: 'name', order: 'desc' } as never);

        expect(fetchMock).toHaveBeenCalledWith(
            expect.objectContaining({ url: `${topicAdminEndpoint}/?page=2&perPage=20&order=DESC&field=NAME` }),
        );
    });

    it('falls back to NAME/ASC and perPage 10', async () => {
        fetchMock.mockResolvedValue([]);

        await getTopicData({ current: 1 } as never);

        expect(fetchMock).toHaveBeenCalledWith(
            expect.objectContaining({ url: `${topicAdminEndpoint}/?page=1&perPage=10&order=ASC&field=NAME` }),
        );
    });

    it('wraps an array result as {total, data}', async () => {
        fetchMock.mockResolvedValue([{ id: 1 }, { id: 2 }]);

        await expect(getTopicData({ current: 1 } as never)).resolves.toEqual({
            total: 2,
            data: [{ id: 1 }, { id: 2 }],
        });
    });

    it('returns an empty list when the response is not an array', async () => {
        fetchMock.mockResolvedValue({ not: 'an array' });

        await expect(getTopicData({ current: 1 } as never)).resolves.toEqual({ total: 0, data: [] });
    });
});
