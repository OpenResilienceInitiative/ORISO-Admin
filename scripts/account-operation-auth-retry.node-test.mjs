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
const { AccountOperationIntent } = await import('../src/utils/accountOperationIntent.ts');
const tokenFor = (subject, revision) =>
    `header.${Buffer.from(JSON.stringify({ sub: subject, revision })).toString('base64url')}.signature`;

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
