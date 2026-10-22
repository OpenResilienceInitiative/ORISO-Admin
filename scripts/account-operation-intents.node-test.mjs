import assert from 'node:assert/strict';
import { test } from 'node:test';
import { register } from 'node:module';

const requests = [];
globalThis.__accountIntentFetch = (request) => {
    requests.push(request);
    return Promise.resolve({ status: 200, json: async () => ({ _embedded: {} }) });
};
const fixtureHooks = {
    resolve(specifier, context, nextResolve) {
        if (context.parentURL?.endsWith('/src/api/fetchData.ts')) return nextResolve(specifier, context);
        if (context.parentURL?.includes('/src/')) {
            if (specifier === '@tanstack/react-query') return { url: 'account-intent:query', shortCircuit: true };
            if (specifier === 'react') return { url: 'account-intent:react', shortCircuit: true };
            if (specifier.endsWith('/useUserData.hook')) return { url: 'account-intent:user-data', shortCircuit: true };
            if (specifier.endsWith('/useSingleTenantData'))
                return { url: 'account-intent:tenant-data', shortCircuit: true };
            if (specifier.endsWith('/useTenantUserAdminData'))
                return { url: 'account-intent:tenant-admin-data', shortCircuit: true };
            if (specifier.endsWith('/useAgencyConsultants'))
                return { url: 'account-intent:agency-constants', shortCircuit: true };
            if (specifier.endsWith('/enums/TwoFactorType'))
                return { url: 'account-intent:twofactor-enum', shortCircuit: true };
            if (specifier.endsWith('/enums/TypeOfUser')) return { url: 'account-intent:user-enum', shortCircuit: true };
            if (specifier.endsWith('/admins/addAgencyAdminData'))
                return { url: 'account-intent:add-admin', shortCircuit: true };
            if (specifier.endsWith('/counselor/addCounselorData'))
                return { url: 'account-intent:add-counselor', shortCircuit: true };
            if (specifier.endsWith('/fetchData')) return { url: 'account-intent:fetch', shortCircuit: true };
            if (specifier.endsWith('/appConfig')) return { url: 'account-intent:config', shortCircuit: true };
        }
        if (
            specifier === 'antd/lib/select' ||
            specifier.endsWith('/types/counselor') ||
            specifier.endsWith('/types/admin')
        )
            return { url: 'account-intent:types', shortCircuit: true };
        if (specifier.startsWith('.')) {
            const candidate = new URL(`${specifier}.ts`, context.parentURL);
            if (existsSync(candidate)) return { url: candidate.href, shortCircuit: true };
        }
        return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
        const source = {
            'account-intent:fetch': `export const FETCH_SUCCESS={CONTENT:'CONTENT'}; export const FETCH_ERRORS = {}; export const FETCH_METHODS = {PUT:'PUT',POST:'POST',DELETE:'DELETE',PATCH:'PATCH'}; export const fetchData = props => globalThis.__accountIntentFetch(props);`,
            'account-intent:config': `export const publicAccountInvitesEndpoint='/users/account-invites',twoFactorAuthApp='/users/2fa/app',twoFactorAuthAppEmail='/users/2fa/email',twoFactorAuth='/users/2fa',userDataEndpoint='/users/data',agencyAdminEndpoint='/useradmin/agencyadmins',counselorEndpoint='/useradmin/consultants',userAdminDataEndpoint='/useradmin/data',userPasswordChangeEndpoint='/users/password/change',tenantAdminsEndpoint='/useradmin/tenantadmins';`,
            'account-intent:query': `export const UseMutationOptions=undefined; export const useMutation=options=>globalThis.__createAccountTestMutation(options); export const useQueryClient=()=>({invalidateQueries(){},setQueryData(){},removeQueries(){},getQueryData(){}});`,
            'account-intent:react': `export const useRef=value=>({current:value}); export const useCallback=callback=>callback;`,
            'account-intent:user-data': `export const USER_DATA_KEY='user-data';`,
            'account-intent:tenant-data': `export const TENANT_QUERY_KEY='tenant';`,
            'account-intent:tenant-admin-data': `export const TENANT_ADMIN_QUERY_KEY='tenant-admin',TENANT_ADMINS_QUERY_KEY='tenant-admins'; export const useTenantUserAdminData=()=>({data:{username:'stored-username'}});`,
            'account-intent:agency-constants': `export const AGENCY_CONSULTANTS_KEY='agency-consultants';`,
            'account-intent:twofactor-enum': `export const TwoFactorType={App:'APP',Email:'EMAIL'};`,
            'account-intent:user-enum': `export const TypeOfUser={Consultants:'consultants'};`,
            'account-intent:add-admin': `export const addAgencyAdminData=()=>{throw new Error('create is outside this edit probe')};`,
            'account-intent:add-counselor': `export const addCounselorData=()=>{throw new Error('create is outside this edit probe')};`,
            'account-intent:types': `export const LabeledValue = undefined, CounselorData = undefined, AdminData = undefined;`,
        }[url];
        return source !== undefined ? { format: 'module', source, shortCircuit: true } : nextLoad(url, context);
    },
};
// Node 22's async loader runs fixture resolution separately; emitted modules
// still execute in the test process and use its isolated transport stubs.
register(
    `data:text/javascript,${encodeURIComponent(
        [
            "import { existsSync } from 'node:fs';",
            `const hooks = {${fixtureHooks.resolve.toString()},${fixtureHooks.load.toString()}};`,
            'export const resolve = hooks.resolve; export const load = hooks.load;',
        ].join('\n'),
    )}`,
    import.meta.url,
);
const { AccountOperationIntent, AccountOperationActions } = await import('../src/utils/accountOperationIntent.ts');

for (const operation of ['registerTenantAdmin', 'sendTwoFactorEmail', 'activateTwoFactor']) {
    test(`public Wizard ${operation} keeps its request ID after an unknown outcome`, async () => {
        const { createHttpTenantAdminOnboardingClient } = await import(
            '../src/api/tenantOnboarding/tenantOnboarding.ts'
        );
        const previous = globalThis.__accountIntentFetch;
        const observed = [];
        globalThis.__accountIntentFetch = (request) => {
            observed.push(request);
            if (observed.length === 1) return Promise.reject(new TypeError('synthetic reply lost'));
            return Promise.resolve({ tenantId: 7, twoFactor: { secret: null, qrCodeBase64: null } });
        };
        try {
            const client = createHttpTenantAdminOnboardingClient();
            const args =
                operation === 'registerTenantAdmin'
                    ? ['synthetic-link', { account: { password: 'synthetic-only' } }]
                    : operation === 'activateTwoFactor'
                    ? ['synthetic-link', '123456', 'APP']
                    : ['synthetic-link'];
            await assert.rejects(client[operation](...args));
            await client[operation](...args);
            const [first, retry] = observed;
            assert.match(first.headersData?.['Idempotency-Key'] ?? '', /^[0-9a-f-]{36}$/);
            assert.deepEqual(retry, first);
            assert.equal(first.skipAuth, true);
            await client[operation](...args);
            assert.notEqual(observed[2].headersData['Idempotency-Key'], first.headersData['Idempotency-Key']);
        } finally {
            globalThis.__accountIntentFetch = previous;
        }
    });
}

for (const [name, args] of [
    ['apiPutTwoFactorAuthApp', [{ secret: 'test-secret', otp: '123456' }]],
    ['apiPutTwoFactorAuthEmail', ['a@example.test']],
    ['apiPostTwoFactorAuthEmailWithCode', ['123456']],
    ['apiDeleteTwoFactorAuth', []],
]) {
    test(`actual Admin ${name} preserves the supplied request ID`, async () => {
        const api = (await import('../src/api/user/apiTwoFactorAuth.ts'))[name];
        const intent = new AccountOperationIntent();
        await api(...args, intent);
        await api(...args, intent);
        const [first, retry] = requests.slice(-2);
        assert.equal(first.headersData?.['Idempotency-Key'], intent.id);
        assert.deepEqual(retry, first);
    });
}

for (const [path, name] of [
    ['admins/editAgencyAdminData', 'editAgencyAdminData'],
    ['counselor/editCounselorData', 'editCounselorData'],
]) {
    test(`actual ${name} uses separate stable agency/profile sub-IDs`, async () => {
        const api = (await import(`../src/api/${path}.ts`))[name];
        const intent = new AccountOperationIntent();
        const data = { firstname: 'Test', lastname: 'Person', email: 'a@example.test', agencies: [{ value: '7' }] };
        await api('target-id', data, intent);
        const first = requests.slice(-2);
        await api('target-id', data, intent);
        const retry = requests.slice(-2);
        assert.deepEqual(retry, first);
        assert.ok(first[0].headersData?.['Idempotency-Key']);
        assert.ok(first[1].headersData?.['Idempotency-Key']);
        assert.notEqual(first[0].headersData['Idempotency-Key'], first[1].headersData['Idempotency-Key']);
    });
}

test('Admin action unknown retry retains captured credentials without storage', async () => {
    const actions = new AccountOperationActions();
    const seen = [];
    const send = (payload, intent) => {
        seen.push([payload, intent.id]);
        return seen.length === 1 ? Promise.reject(new TypeError('reply lost')) : Promise.resolve();
    };
    const payload = { oldPassword: 'old-test', newPassword: 'new-test' };
    await assert.rejects(actions.run('password', '/users/password/change', payload, send));
    await actions.run('password', '/users/password/change', payload, send);
    assert.deepEqual(seen[0], seen[1]);
});

// This drives the actual hook callback with an isolated mutation boundary. It
// proves preparation happens before mutationFn, not React rendering/query internals.
globalThis.__createAccountTestMutation = (config) => {
    const mutateAsync = async (variables, options) => {
        globalThis.__lastAccountMutationVariables = variables;
        const result = await config.mutationFn(variables);
        await config.onSuccess?.(result, variables, undefined, undefined);
        await options?.onSuccess?.(result, variables, undefined, undefined);
        return result;
    };
    return {
        mutateAsync,
        mutate: (variables, options) => {
            void mutateAsync(variables, options);
        },
    };
};

for (const [file, exported, options, payload] of [
    ['useUpdateUserData.hook', 'useUpdateUserData', undefined, { firstname: 'Test', lastname: 'Person' }],
    [
        'useUpdateUserPassword.hook',
        'useUpdateUserPassword',
        undefined,
        { oldPassword: 'old-test', newPassword: 'new-test' },
    ],
    [
        'useUserTwoFactorAuth.hook',
        'useUserTwoFactorAuth',
        undefined,
        { twoFactorType: 'APP', secret: 'test-secret', otp: '123456' },
    ],
    ['useUserTwoFactorAuth.hook', 'useUserTwoFactorSendEmailCode', undefined, 'a@example.test'],
    ['useUserTwoFactorAuth.hook', 'useUserTwoFactorDelete', undefined, undefined],
    [
        'useAddOrUpdateConsultantOrAgencyAdmin',
        'useAddOrUpdateConsultantOrAdmin',
        { id: 'target-id', typeOfUser: 'consultants' },
        { firstname: 'Test', agencies: [{ value: '7' }] },
    ],
    [
        'useAddOrUpdateTenantAdmin.hook',
        'useAddOrUpdateTenantAdmin',
        { id: 'target-id' },
        { firstname: 'Test', email: 'a@example.test' },
    ],
]) {
    test(`actual ${exported} prepares intent before mutation and retains an unknown retry`, async () => {
        const hook = (await import(`../src/hooks/${file}.ts`))[exported];
        const mutation = hook(options);
        const previousFetch = globalThis.__accountIntentFetch;
        let fail = true;
        globalThis.__accountIntentFetch = (request) => {
            requests.push(request);
            return fail
                ? Promise.reject(new TypeError('reply lost'))
                : Promise.resolve({ status: 200, json: async () => ({ _embedded: {} }) });
        };
        try {
            await assert.rejects(mutation.mutateAsync(payload));
            const first = requests.at(-1);
            const firstVariables = globalThis.__lastAccountMutationVariables;
            assert.ok(firstVariables?.operationIntent, 'intent exists before the mutation boundary');
            assert.ok(first.headersData?.['Idempotency-Key']);
            fail = false;
            await mutation.mutateAsync(payload);
            const retry = requests.findLast((request) => request.url === first.url);
            assert.deepEqual(retry, first);
        } finally {
            globalThis.__accountIntentFetch = previousFetch;
        }
    });
}

for (const [file, exported, options, payload] of [
    ['useUpdateUserData.hook', 'useUpdateUserData', undefined, { firstname: 'Test' }],
    [
        'useUpdateUserPassword.hook',
        'useUpdateUserPassword',
        undefined,
        { oldPassword: 'old-test', newPassword: 'new-test' },
    ],
    ['useUserTwoFactorAuth.hook', 'useUserTwoFactorSendEmailCode', undefined, 'a@example.test'],
    ['useUserTwoFactorAuth.hook', 'useUserTwoFactorDelete', undefined, undefined],
    [
        'useAddOrUpdateConsultantOrAgencyAdmin',
        'useAddOrUpdateConsultantOrAdmin',
        { id: 'target-id', typeOfUser: 'consultants' },
        { firstname: 'Test', agencies: [{ value: '7' }] },
    ],
    [
        'useAddOrUpdateTenantAdmin.hook',
        'useAddOrUpdateTenantAdmin',
        { id: 'target-id' },
        { firstname: 'Test', email: 'a@example.test' },
    ],
]) {
    test(`actual ${exported} ends a confirmed terminal refusal before a new submission`, async () => {
        const hook = (await import(`../src/hooks/${file}.ts`))[exported];
        const mutation = hook(options);
        const previousFetch = globalThis.__accountIntentFetch;
        let fail = true;
        globalThis.__accountIntentFetch = (request) => {
            requests.push(request);
            return fail
                ? Promise.reject(Object.assign(new Error('BAD_REQUEST'), { status: 400 }))
                : Promise.resolve({ status: 200, json: async () => ({ _embedded: {} }) });
        };
        try {
            await assert.rejects(mutation.mutateAsync(payload));
            const first = globalThis.__lastAccountMutationVariables.operationIntent.id;
            fail = false;
            await mutation.mutateAsync(payload);
            assert.notEqual(globalThis.__lastAccountMutationVariables.operationIntent.id, first);
        } finally {
            globalThis.__accountIntentFetch = previousFetch;
        }
    });
}

for (const [file, exported, options, payload] of [
    ['useUpdateUserData.hook', 'useUpdateUserData', undefined, { firstname: 'Test' }],
    [
        'useUpdateUserPassword.hook',
        'useUpdateUserPassword',
        undefined,
        { oldPassword: 'old-test', newPassword: 'new-test' },
    ],
    [
        'useUserTwoFactorAuth.hook',
        'useUserTwoFactorAuth',
        undefined,
        { twoFactorType: 'APP', secret: 'test-secret', otp: '123456' },
    ],
    ['useUserTwoFactorAuth.hook', 'useUserTwoFactorSendEmailCode', undefined, 'a@example.test'],
    ['useUserTwoFactorAuth.hook', 'useUserTwoFactorDelete', undefined, undefined],
    [
        'useAddOrUpdateConsultantOrAgencyAdmin',
        'useAddOrUpdateConsultantOrAdmin',
        { id: 'target-id', typeOfUser: 'consultants' },
        { firstname: 'Test', agencies: [{ value: '7' }] },
    ],
    [
        'useAddOrUpdateTenantAdmin.hook',
        'useAddOrUpdateTenantAdmin',
        { id: 'target-id' },
        { firstname: 'Test', email: 'a@example.test' },
    ],
]) {
    test(`actual ${exported} supersedes an unknown action after an explicit edit event`, async () => {
        const mutation = (await import(`../src/hooks/${file}.ts`))[exported](options);
        const previousFetch = globalThis.__accountIntentFetch;
        let fail = true;
        globalThis.__accountIntentFetch = (request) => {
            requests.push(request);
            return fail
                ? Promise.reject(new TypeError('reply lost'))
                : Promise.resolve({ status: 200, json: async () => ({ _embedded: {} }) });
        };
        try {
            await assert.rejects(mutation.mutateAsync(payload));
            const first = globalThis.__lastAccountMutationVariables.operationIntent.id;
            assert.equal(typeof mutation.onAccountEdit, 'function');
            mutation.onAccountEdit();
            fail = false;
            await mutation.mutateAsync(payload);
            assert.notEqual(globalThis.__lastAccountMutationVariables.operationIntent.id, first);
        } finally {
            globalThis.__accountIntentFetch = previousFetch;
        }
    });
}
