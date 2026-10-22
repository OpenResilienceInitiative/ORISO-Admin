import assert from 'node:assert/strict';
import { test } from 'node:test';
import { register } from 'node:module';

const stubs = {
    antd: `export const message={error(){},warning(){}};`,
    i18next: `export default {language:'de'};`,
    './auth/auth': `export const getAccessTokenForRequests=()=>globalThis.__accountAuthToken; export const tryRefreshAccessToken=async()=>{globalThis.__accountRefreshCount++;globalThis.__accountAuthToken=globalThis.__accountRefreshedToken;return true;};`,
    '../utils/generateCsrfToken': `export default ()=>'csrf-test';`,
    '../utils/language': `export const DEFAULT_LANGUAGE='de',normalizeLanguage=value=>value;`,
    './auth/logout': `export default ()=>{throw new Error('unexpected logout')};`,
    '../appConfig': `export const CSRF_WHITELIST_HEADER=undefined;`,
};
const fixtureHooks = {
    resolve(specifier, context, nextResolve) {
        if (context.parentURL?.endsWith('/src/api/fetchData.ts') && stubs[specifier])
            return { url: `account-auth:${encodeURIComponent(specifier)}`, shortCircuit: true };
        if (specifier.startsWith('.')) {
            const candidate = new URL(`${specifier}.ts`, context.parentURL);
            if (existsSync(candidate)) return { url: candidate.href, shortCircuit: true };
        }
        return nextResolve(specifier, context);
    },
    async load(url, context, nextLoad) {
        if (url.startsWith('account-auth:'))
            return {
                format: 'module',
                source: stubs[decodeURIComponent(url.slice('account-auth:'.length))],
                shortCircuit: true,
            };
        const result = await nextLoad(url, context);
        if (url.endsWith('/src/api/fetchData.ts')) {
            // Vite replaces this environment constant in the real app. No
            // transport or retry logic is rewritten by this Node-only fixture.
            return { ...result, source: String(result.source).replace('import.meta.env.DEV', 'false') };
        }
        return result;
    },
};
// Node 22's async loader runs fixture resolution separately; emitted modules
// still execute in the test process and use its isolated transport stubs.
register(
    `data:text/javascript,${encodeURIComponent(
        [
            "import { existsSync } from 'node:fs';",
            `const stubs = ${JSON.stringify(stubs)};`,
            `const hooks = {${fixtureHooks.resolve.toString()},${fixtureHooks.load.toString()}};`,
            'export const resolve = hooks.resolve; export const load = hooks.load;',
        ].join('\n'),
    )}`,
    import.meta.url,
);
const { AccountOperationIntent, AccountOperationActions } = await import('../src/utils/accountOperationIntent.ts');
const tokenFor = (subject, revision) =>
    `header.${Buffer.from(JSON.stringify({ sub: subject, revision })).toString('base64url')}.signature`;

async function withObservedMutationResponse(respond, check) {
    const { fetchData, FETCH_ERRORS } = await import('../src/api/fetchData.ts');
    const previous = globalThis.fetch;
    const requests = [];
    const actions = new AccountOperationActions();
    const url = 'https://unit.oriso.invalid/useradmin/consultants/synthetic-account';
    globalThis.__accountAuthToken = tokenFor('same-admin', 1);
    globalThis.fetch = async (request) => {
        requests.push(request.headers.get('Idempotency-Key'));
        return respond(request, requests.length);
    };
    const run = () =>
        actions.run('save', url, { firstName: 'Lisa' }, (payload, intent) => {
            const body = JSON.stringify(payload);
            return fetchData({
                url,
                method: 'PUT',
                bodyData: body,
                timeout: 1,
                headersData: intent.headersFor('PUT', url, body),
                responseHandling: [
                    FETCH_ERRORS.BAD_REQUEST,
                    FETCH_ERRORS.FORBIDDEN_SILENT,
                    FETCH_ERRORS.CONFLICT,
                    FETCH_ERRORS.PRECONDITION_FAILED,
                ],
            });
        });
    try {
        await check(run, requests);
    } finally {
        globalThis.fetch = previous;
    }
}

for (const status of [400, 403, 412, 422]) {
    test(`unknown Admin mutation retains its original intent after an unsigned ${status}`, async () => {
        await withObservedMutationResponse(
            (request, number) => {
                if (number === 1) throw new TypeError('synthetic first response lost');
                return new Response(null, { status: number === 2 ? status : 204 });
            },
            async (run, requests) => {
                await assert.rejects(run());
                await assert.rejects(run());
                await run();
                assert.equal(requests[2], requests[0]);
                await run();
                assert.notEqual(requests[3], requests[0]);
            },
        );
    });
}

test('matching committed NO_EFFECT response ends an unknown Admin attempt', async () => {
    await withObservedMutationResponse(
        (request, number) => {
            if (number === 1) throw new TypeError('synthetic first response lost');
            return new Response(
                null,
                number === 2
                    ? {
                          status: 409,
                          headers: {
                              'X-ORISO-Mutation-Outcome': 'NO_EFFECT',
                              'X-ORISO-Mutation-Operation': request.headers.get('Idempotency-Key'),
                          },
                      }
                    : { status: 204 },
            );
        },
        async (run, requests) => {
            await assert.rejects(run());
            await assert.rejects(run(), (error) => error.status === 409);
            await run();
            assert.notEqual(requests[2], requests[0]);
        },
    );
});

test('another operation NO_EFFECT response cannot retire an unknown Admin intent', async () => {
    await withObservedMutationResponse(
        (request, number) => {
            if (number === 1) throw new TypeError('synthetic first response lost');
            return new Response(
                null,
                number === 2
                    ? {
                          status: 400,
                          headers: {
                              'X-ORISO-Mutation-Outcome': 'NO_EFFECT',
                              'X-ORISO-Mutation-Operation': 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                          },
                      }
                    : { status: 204 },
            );
        },
        async (run, requests) => {
            await assert.rejects(run());
            await assert.rejects(run());
            await run();
            assert.equal(requests[2], requests[0]);
        },
    );
});

test('error properties cannot invent a committed Admin NO_EFFECT response', async () => {
    const actions = new AccountOperationActions();
    const attempts = [];
    const run = () =>
        actions.run('save', 'synthetic-account', {}, async (payload, intent) => {
            attempts.push(intent.id);
            if (attempts.length === 1) throw new TypeError('synthetic first response lost');
            if (attempts.length === 2)
                throw Object.assign(new Error('synthetic forged fields'), {
                    status: 400,
                    mutationOutcome: 'NO_EFFECT',
                    mutationOperation: intent.id,
                });
        });
    await assert.rejects(run());
    await assert.rejects(run());
    await run();
    assert.equal(attempts[2], attempts[0]);
});

test('a previously verified refusal cannot acknowledge a different Admin attempt', async () => {
    let previousReply;
    await assert.rejects(
        new AccountOperationActions().run('save', 'first-account', {}, async (payload, intent) => {
            previousReply = new Response(null, {
                status: 409,
                headers: {
                    'X-ORISO-Mutation-Outcome': 'NO_EFFECT',
                    'X-ORISO-Mutation-Operation': intent.id,
                },
            });
            throw previousReply;
        }),
    );
    const current = new AccountOperationActions();
    const ids = [];
    const run = () =>
        current.run('save', 'second-account', {}, async (payload, intent) => {
            ids.push(intent.id);
            if (ids.length === 1) throw new TypeError('synthetic current response lost');
            if (ids.length === 2) throw previousReply;
        });
    await assert.rejects(run());
    await assert.rejects(run());
    await run();
    assert.equal(ids[2], ids[0]);
});

test('actual Admin auth refresh retains account ID and exact body', async () => {
    const { fetchData, FETCH_ERRORS } = await import('../src/api/fetchData.ts');
    const url = 'https://unit.oriso.invalid/users/password/change';
    const body = JSON.stringify({ oldPassword: 'old-test', newPassword: 'new-test' });
    const intent = new AccountOperationIntent();
    const requests = [];
    const previousFetch = globalThis.fetch;
    globalThis.__accountAuthToken = tokenFor('same-admin', 1);
    globalThis.__accountRefreshedToken = tokenFor('same-admin', 2);
    globalThis.__accountRefreshCount = 0;
    globalThis.fetch = async (request) => {
        requests.push({ headers: Object.fromEntries(request.headers), body: await request.text() });
        return new Response(null, { status: requests.length === 1 ? 401 : 204 });
    };
    try {
        await fetchData({
            url,
            method: 'PUT',
            bodyData: body,
            timeout: 1,
            responseHandling: [FETCH_ERRORS.BAD_REQUEST],
            headersData: intent.headersFor('PUT', url, body),
        });
        assert.equal(requests.length, 2);
        assert.equal(globalThis.__accountRefreshCount, 1);
        assert.equal(requests[0].headers['idempotency-key'], intent.id);
        assert.equal(requests[1].headers['idempotency-key'], intent.id);
        assert.equal(requests[0].body, requests[1].body);
        assert.equal(requests[0].headers.authorization, `Bearer ${tokenFor('same-admin', 1)}`);
        assert.equal(requests[1].headers.authorization, `Bearer ${tokenFor('same-admin', 2)}`);
    } finally {
        globalThis.fetch = previousFetch;
    }
});

test('actual HTTP refusal keeps the existing Error message and carries response status', async () => {
    const { fetchData, FETCH_ERRORS } = await import('../src/api/fetchData.ts');
    const previousFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(null, { status: 400 });
    try {
        await assert.rejects(
            fetchData({
                url: 'https://unit.oriso.invalid/users/password/change',
                method: 'PUT',
                bodyData: '{}',
                timeout: 1,
                responseHandling: [FETCH_ERRORS.BAD_REQUEST],
            }),
            (error) => {
                assert.equal(error.message, FETCH_ERRORS.BAD_REQUEST);
                assert.equal(error.status, 400);
                return true;
            },
        );
    } finally {
        globalThis.fetch = previousFetch;
    }
});

test('a declared precondition refusal keeps its specific message and actual HTTP status', async () => {
    const { fetchData, FETCH_ERRORS } = await import('../src/api/fetchData.ts');
    const previousFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(null, { status: 412 });
    try {
        await assert.rejects(
            fetchData({
                url: 'https://unit.oriso.invalid/users/2fa/app',
                method: 'PUT',
                bodyData: '{}',
                timeout: 1,
                responseHandling: [FETCH_ERRORS.BAD_REQUEST, FETCH_ERRORS.PRECONDITION_FAILED],
            }),
            (error) => {
                assert.equal(error.message, FETCH_ERRORS.PRECONDITION_FAILED);
                assert.equal(error.status, 412);
                return true;
            },
        );
    } finally {
        globalThis.fetch = previousFetch;
    }
});

test('a frozen account mutation cannot refresh into a different BFF subject', async () => {
    const { fetchData, FETCH_ERRORS } = await import('../src/api/fetchData.ts');
    const previousFetch = globalThis.fetch;
    const url = 'https://unit.oriso.invalid/users/password/change';
    const body = JSON.stringify({ oldPassword: 'old-test', newPassword: 'new-test' });
    const intent = new AccountOperationIntent();
    let requests = 0;
    globalThis.__accountAuthToken = tokenFor('original-admin', 1);
    globalThis.__accountRefreshedToken = tokenFor('different-admin', 2);
    globalThis.__accountRefreshCount = 0;
    globalThis.fetch = async () => new Response(null, { status: ++requests === 1 ? 401 : 204 });
    try {
        await assert.rejects(
            fetchData({
                url,
                method: 'PUT',
                bodyData: body,
                timeout: 1,
                responseHandling: [FETCH_ERRORS.BAD_REQUEST],
                headersData: intent.headersFor('PUT', url, body),
            }),
            (error) => {
                assert.equal(error.message, 'REQUEST_IDENTITY_CHANGED');
                return true;
            },
        );
        assert.equal(requests, 1, 'The frozen body must never be sent under the new subject');
        assert.equal(globalThis.__accountRefreshCount, 1);
    } finally {
        globalThis.fetch = previousFetch;
    }
});

test('a frozen account mutation cannot infer its original subject from the refreshed token', async () => {
    const { fetchData, FETCH_ERRORS } = await import('../src/api/fetchData.ts');
    const previousFetch = globalThis.fetch;
    const url = 'https://unit.oriso.invalid/users/password/change';
    const intent = new AccountOperationIntent();
    let requests = 0;
    globalThis.__accountAuthToken = 'unreadable-old-token';
    globalThis.__accountRefreshedToken = tokenFor('refreshed-admin', 2);
    globalThis.fetch = async () => new Response(null, { status: ++requests === 1 ? 401 : 204 });
    try {
        await assert.rejects(
            fetchData({
                url,
                method: 'PUT',
                bodyData: '{}',
                timeout: 1,
                responseHandling: [FETCH_ERRORS.BAD_REQUEST],
                headersData: intent.headersFor('PUT', url, '{}'),
            }),
            (error) => {
                assert.equal(error.message, 'REQUEST_IDENTITY_CHANGED');
                return true;
            },
        );
        assert.equal(requests, 1);
    } finally {
        globalThis.fetch = previousFetch;
    }
});
