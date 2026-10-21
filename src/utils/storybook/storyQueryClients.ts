import { QueryClient } from '@tanstack/react-query';

const queryClients = new Set<QueryClient>();

export const createStoryQueryClient = () => {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClients.add(client);
    return client;
};

export const releaseStoryQueryClient = (client: QueryClient) => {
    client.clear();
    queryClients.delete(client);
};

export const clearStoryQueryClients = async () => {
    try {
        const cancelled = await Promise.allSettled(
            [...queryClients].map((client) => Promise.resolve().then(() => client.cancelQueries())),
        );
        const errors = cancelled.flatMap((result) => (result.status === 'rejected' ? [result.reason] : []));
        if (errors.length) throw new AggregateError(errors, errors.map(String).join('\n'));
    } finally {
        queryClients.forEach((client) => client.clear());
        queryClients.clear();
    }
};
