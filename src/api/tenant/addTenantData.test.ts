/* eslint-disable no-console, @typescript-eslint/no-var-requires, global-require */
/**
 * Pure-logic test for buildTenantCreatePayload.
 *
 * Runnable in isolation (no jest in repo, Cypress can't run bare):
 *     npx ts-node --transpile-only --compiler-options '{"module":"commonjs"}' src/api/tenant/addTenantData.test.ts
 * (--transpile-only because the project tsconfig omits node types.)
 *
 * The module under test statically imports `../fetchData` and `../../appConfig`,
 * which transitively pull in Vite-only `import.meta.env` (and antd/i18next).
 * Those are irrelevant to the PURE function, so we register lightweight stubs in
 * the CommonJS module cache BEFORE requiring the module. Does NOT run in CI.
 */
// --- stub the heavy/Vite-only dependencies so a bare CommonJS require works ---
// `../fetchData` and `../../appConfig` transitively import `import.meta.env`
// (Vite-only) plus antd/i18next, none of which the PURE function touches.
const ModuleCtor = require('module');
const realLoad = ModuleCtor._load;
const stubByRequest: Record<string, any> = {
    '../fetchData': {
        FETCH_ERRORS: { CATCH_ALL: 'CATCH_ALL' },
        FETCH_METHODS: { POST: 'POST' },
        fetchData: () => Promise.resolve({ status: 200, json: () => ({}) }),
    },
    '../../appConfig': {
        tenantEndpoint: '/service/tenant/',
    },
};
ModuleCtor._load = function patched(request: string, parent: any, isMain: boolean) {
    if (request in stubByRequest) {
        return stubByRequest[request];
    }
    return realLoad.call(this, request, parent, isMain);
};

const { buildTenantCreatePayload } = require('./addTenantData');

let failures = 0;
const check = (label: string, cond: boolean) => {
    if (!cond) {
        failures += 1;
        console.error(`  FAIL: ${label}`);
    } else {
        console.log(`  ok: ${label}`);
    }
};

console.log('buildTenantCreatePayload');

const formData = {
    name: 'Caritas',
    subdomain: 'caritas',
    createDate: '2026-06-24',
    allowedNumberOfUsers: 42,
    settings: { featureTopicsEnabled: true },
    formalLanguage: true,
    consultingType: '0',
    twoFactorAuth: false,
    videoFeature: true,
    address: 'Musterstr. 1, 12345 Musterstadt',
    description: 'Beratungsträger für die Region',
    // frontend-only, must NOT be forwarded:
    topic: 'Sucht',
    // arbitrary extra field, must be stripped:
    somethingElse: 'ignore me',
};

const payload = buildTenantCreatePayload(formData) as Record<string, any>;

check('includes address', payload.address === 'Musterstr. 1, 12345 Musterstadt');
check('includes description', payload.description === 'Beratungsträger für die Region');
check('EXCLUDES topic', !('topic' in payload));
check('EXCLUDES unknown field', !('somethingElse' in payload));
check('nests allowedNumberOfUsers under licensing', payload.licensing?.allowedNumberOfUsers === 42);
check('keeps name', payload.name === 'Caritas');
check('keeps subdomain', payload.subdomain === 'caritas');
check('keeps consultingType', payload.consultingType === '0');

// undefined optional fields stay undefined (not crash)
const minimal = buildTenantCreatePayload({ name: 'X', subdomain: 'x' }) as Record<string, any>;
check('address undefined when absent', minimal.address === undefined);
check('description undefined when absent', minimal.description === undefined);
check('no topic key when absent', !('topic' in minimal));

if (failures > 0) {
    console.error(`\nbuildTenantCreatePayload: ${failures} assertion(s) FAILED`);
    process.exit(1);
} else {
    console.log('\nbuildTenantCreatePayload: ALL PASSED');
}
