import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { unlinkSync, mkdirSync, writeFileSync, openSync, closeSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { sourceIdentity } from './verification-provenance.mjs';
import { diagnosticCaseOrder } from './diagnostic-case-order.mjs';
import { checkFieldFormBackport } from './field-form-backport.mjs';

// Closed selection; fresh native process/browser lifetime per case, never an acceptance run.
const selections = {
    'token-whole-module': [
        'src/theme/appliedTokenInspection.stories.tsx',
        '^(Red Light German|Red Light English|Red Inverted German|Red Inverted English|Blue Light German|Blue Light English|Blue Inverted German|Blue Inverted English|Component Override And Restore|Missing Effective Root And Restore|Unresolved Authored Root And Restore|Theme Bridge Blue Inverted English)$',
        [
            'Red Light German',
            'Red Light English',
            'Red Inverted German',
            'Red Inverted English',
            'Blue Light German',
            'Blue Light English',
            'Blue Inverted German',
            'Blue Inverted English',
            'Component Override And Restore',
            'Missing Effective Root And Restore',
            'Unresolved Authored Root And Restore',
            'Theme Bridge Blue Inverted English',
        ],
    ],
    'deadline-regression': [
        'src/components/Tenants/LegalSettings/components/DataProcessingAgreementContainer/DataProcessingAgreementContainer.deadline.stories.tsx',
        '^Failed Publication Keeps Draft$',
        ['Failed Publication Keeps Draft'],
    ],
    'registration-regression': [
        'src/pages/Agency/Edit/components/RegistrationSettings/RegistrationSettings.stories.tsx',
        '^Changing The Tenant Drops The Pick$',
        ['Changing The Tenant Drops The Pick'],
    ],
    'token-blue-alone': [
        'src/theme/appliedTokenInspection.stories.tsx',
        '^Blue Inverted English$',
        ['Blue Inverted English'],
    ],
    'token-blue-transition': [
        'src/theme/appliedTokenInspection.stories.tsx',
        '^(Blue Inverted German|Blue Inverted English)$',
        ['Blue Inverted German', 'Blue Inverted English'],
    ],
};
const querySelection = process.argv[2] === 'users-prefix-through-tenant';
const userSequences = {
    'users-prefix-through-tenant': [
        'Filled',
        'LongAgencyNames',
        'Empty',
        'Loading',
        'Error',
        'TenantAdminsForPlatformAdmin',
    ],
    'saved-sort-alone': ['SavedSortOnMount'],
    'filter-saved-sort': ['FilterResetsCardsAt390', 'SavedSortOnMount'],
    'tenant-alone': ['TenantAdminsForPlatformAdmin'],
    'error-tenant-error': ['Error', 'TenantAdminsForPlatformAdmin', 'Error'],
    'tenant-error-tenant': ['TenantAdminsForPlatformAdmin', 'Error', 'TenantAdminsForPlatformAdmin'],
};
assert.equal(process.argv.length, 3, 'Supply one closed diagnostic selection');
const selection = process.argv[2];
assert.ok(
    Object.hasOwn(selections, selection) || Object.hasOwn(userSequences, selection),
    'Unknown diagnostic selection',
);
const directory = path.resolve('verification-artifacts', 'fixture-diagnostic', selection);
mkdirSync(directory, { recursive: true });
const tokenSelection = selection.startsWith('token-');
const repairedRegression = ['deadline-regression', 'registration-regression'].includes(selection);
let generated;
let generatedBytes;
let originalSourceSHA256;
if (Object.hasOwn(userSequences, selection)) {
    generated = 'src/pages/users/List/UserManagement.fixture-diagnostic.stories.tsx';
    const original = readFileSync('src/pages/users/List/UserManagement.stories.tsx', 'utf8');
    originalSourceSHA256 = createHash('sha256').update(original).digest('hex');
    generatedBytes =
        original.replace(
            "title: 'Organisms/Pages/Users/UserManagement',",
            `title: 'Diagnostic/UserManagement/${selection}', includeStories: ${JSON.stringify(
                userSequences[selection].map((_, index) => `Case${index + 1}`),
            )},`,
        ) +
        '\n' +
        userSequences[selection]
            .map((name, index) => `export const Case${index + 1} = { ...${name}, name: 'Case ${index + 1}' };\n`)
            .join('');
    writeFileSync(generated, generatedBytes, { flag: 'wx' });
}
try {
    const source = sourceIdentity(process.cwd(), process.env.VERIFICATION_SOURCE_SHA);
    const args = [
        path.resolve('node_modules/.bin/vp'),
        'test',
        'run',
        '--project',
        'storybook',
        ...(generated ? [generated] : [selections[selection][0], '--testNamePattern', selections[selection][1]]),
    ];
    const input = {
        selection,
        ...(generated && {
            generated: {
                path: generated,
                originalSourceSHA256,
                bytes: generatedBytes,
                sha256: createHash('sha256').update(generatedBytes).digest('hex'),
            },
        }),
        source,
        ...(repairedRegression && { runtimeIntegration: checkFieldFormBackport() }),
        ...(querySelection && {
            queryObserverSource: {
                path: 'scripts/query-lifetime-diagnostic.ts',
                sha256: createHash('sha256').update(readFileSync('scripts/query-lifetime-diagnostic.ts')).digest('hex'),
            },
        }),
        command: [process.execPath, ...args],
        profile: 'functional-pilot',
        acceptance: false,
        timeoutMs: 180000,
        startedAtUTC: new Date().toISOString(),
    };
    writeFileSync(path.join(directory, 'input.json'), JSON.stringify(input, null, 2), { flag: 'wx' });
    const log = openSync(path.join(directory, 'child.log'), 'wx');
    const cleanDiagnosticEnv = { ...process.env };
    for (const key of ['VITE_ORISO_USER_SEQUENCE', 'VITE_ORISO_TOKEN_DIAGNOSTIC', 'VITE_ORISO_QUERY_LIFETIME'])
        delete cleanDiagnosticEnv[key];
    const child = spawn(process.execPath, args, {
        detached: process.platform !== 'win32',
        stdio: ['ignore', log, log],
        env: {
            ...cleanDiagnosticEnv,
            ORISO_VERIFICATION_PROFILE: 'functional-pilot',
            ...(querySelection
                ? { VITE_ORISO_QUERY_LIFETIME: selection }
                : generated
                ? { VITE_ORISO_USER_SEQUENCE: selection }
                : tokenSelection
                ? { VITE_ORISO_TOKEN_DIAGNOSTIC: selection }
                : {}),
            VERIFICATION_ARTIFACTS_DIR: directory,
        },
    });
    let timedOut = false;
    const timer = setTimeout(() => {
        timedOut = true;
        try {
            if (process.platform !== 'win32') process.kill(-child.pid, 'SIGKILL');
            else child.kill('SIGKILL');
        } catch (error) {
            if (error.code !== 'ESRCH') throw error;
        }
    }, 180000);
    const outcome = await new Promise((resolve) => {
        child.on('error', (error) => resolve({ error: error.message }));
        child.on('close', (exitCode, signal) => resolve({ exitCode, signal }));
    });
    clearTimeout(timer);
    closeSync(log);
    const runs = readdirSync(directory).filter((name) => name.startsWith('run-'));
    let inventory;
    if (runs.length === 1) {
        const file = path.join(directory, runs[0], 'inventory.json');
        try {
            inventory = JSON.parse(readFileSync(file, 'utf8'));
        } catch {
            /* Missing evidence remains explicit. */
        }
    }
    const wantedNames = generated
        ? userSequences[selection].map((_, index) => `Case ${index + 1}`)
        : selections[selection][2] ?? [selections[selection][1].slice(0, -1)];
    const expectedCount = wantedNames.length;
    let sequenceMatches = false;
    if (runs.length === 1) {
        const events = readFileSync(path.join(directory, runs[0], 'events.jsonl'), 'utf8')
            .trim()
            .split('\n')
            .map(JSON.parse);
        const cases = readFileSync(path.join(directory, runs[0], 'cases.jsonl'), 'utf8')
            .trim()
            .split('\n')
            .map(JSON.parse);
        let ordering;
        try {
            ordering = diagnosticCaseOrder(events, cases, wantedNames);
            sequenceMatches = true;
        } catch (error) {
            ordering = { error: error.message };
        }
        writeFileSync(
            path.join(directory, 'sequence.json'),
            JSON.stringify({ ...ordering, sequenceMatches }, null, 2),
            { flag: 'wx' },
        );
    }
    let bindingsMatch = false;
    let diagnosticOmittedCases = [];
    if (runs.length === 1 && inventory) {
        const run = path.join(directory, runs[0]);
        const provenance = JSON.parse(readFileSync(path.join(run, 'provenance.json'), 'utf8'));
        const cases = readFileSync(path.join(run, 'cases.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
        const reference = { path: 'provenance.json', runId: provenance.runId };
        const executedCases = cases.filter((item) => ['passed', 'failed'].includes(item.state));
        diagnosticOmittedCases = cases
            .filter((item) => !['passed', 'failed'].includes(item.state))
            .map((item) => ({ name: item.name, state: item.state }));
        bindingsMatch =
            JSON.stringify(provenance.source) === JSON.stringify(source) &&
            provenance.profile === 'functional-pilot' &&
            JSON.stringify(inventory.provenance) === JSON.stringify(reference) &&
            executedCases.length === expectedCount &&
            cases.every(
                (item) =>
                    path.resolve(item.file) === path.resolve(generated ?? selections[selection][0]) &&
                    JSON.stringify(item.provenance) === JSON.stringify(reference),
            ) &&
            executedCases.every(
                (item, index) =>
                    item.name === wantedNames[index] && JSON.stringify(item.provenance) === JSON.stringify(reference),
            );
    }
    const observations = readFileSync(path.join(directory, 'child.log'), 'utf8')
        .split('\n')
        .flatMap((line) => {
            try {
                return [JSON.parse(line.replace(/\x1b\[[0-9;]*m/g, ''))];
            } catch {
                return [];
            }
        });
    let observationComplete;
    if (querySelection) {
        const receipts = observations.filter((item) => item.queryLifetime === 1);
        let validationError;
        try {
            assert.equal(
                receipts.filter(
                    (item) => item.phase === 'witness' && item.contract === 'client-key-signal-request-msw-v1',
                ).length,
                1,
                'Missing/duplicate query observer witness',
            );
            const allowed = [
                'witness',
                'client-bound',
                'mounted',
                'unmounted',
                'cache',
                'query',
                'query-abort',
                'dispatch',
                'request-abort',
                'settled',
                'boundary',
                'msw',
                'ambiguous',
                'invalid',
                'released',
            ];
            receipts.forEach((item, index) => {
                assert.equal(item.selection, selection, 'Observer selection mismatch');
                assert.equal(item.sequence, index + 1, 'Observer sequence gap');
                assert.ok(Number.isFinite(item.at) && allowed.includes(item.phase), 'Unknown observer evidence');
                assert.ok(
                    !item.invalid && !['invalid', 'ambiguous'].includes(item.phase),
                    'Observer evidence invalid/ambiguous',
                );
            });
            const clients = new Map(
                receipts.filter((item) => item.phase === 'client-bound').map((item) => [item.clientId, item.owner]),
            );
            const queries = new Map();
            const requests = new Map();
            const arrivals = new Map();
            receipts.forEach((item) => {
                if (item.clientId) assert.deepEqual(item.owner, clients.get(item.clientId), 'Client owner mismatch');
                if (item.phase === 'query') {
                    assert.ok(!queries.has(item.id), 'Duplicate query identity');
                    queries.set(item.id, item);
                }
                if (item.phase === 'dispatch') {
                    const query = queries.get(item.queryId);
                    assert.ok(query && query.clientId === item.clientId, 'Request/query mismatch');
                    assert.ok(!requests.has(item.requestId), 'Duplicate request identity');
                    requests.set(item.requestId, item);
                }
                if (item.phase === 'msw') {
                    const request = requests.get(item.requestId);
                    assert.ok(request && request.at <= item.at, 'Unproven/noncausal arrival binding');
                    if (item.mswPhase === 'request:start') {
                        assert.ok(!arrivals.has(item.mswId), 'Duplicate arrival identity');
                        arrivals.set(item.mswId, item.requestId);
                    } else assert.equal(arrivals.get(item.mswId), item.requestId, 'Arrival identity changed');
                }
            });
            wantedNames.forEach((name) => {
                const mounted = receipts.filter((item) => item.phase === 'mounted' && item.owner?.name === name);
                assert.ok(mounted.length > 0, 'Missing mounted owner');
                ['before-cancel-clear', 'after-cancel-clear', 'before-reset-handlers', 'after-reset-handlers'].forEach(
                    (boundary) =>
                        assert.ok(
                            receipts.some(
                                (item) =>
                                    item.phase === 'boundary' &&
                                    item.ownerId === mounted[0].owner.id &&
                                    item.boundary === boundary,
                            ),
                            'Missing cleanup boundary',
                        ),
                );
            });
            assert.ok(
                queries.size > 0 && requests.size > 0 && arrivals.size > 0,
                'Missing query/request/arrival witness',
            );
            assert.equal(
                input.queryObserverSource.sha256,
                createHash('sha256').update(readFileSync(input.queryObserverSource.path)).digest('hex'),
                'Observer source changed during run',
            );
        } catch (error) {
            validationError = error.message;
        }
        const invalid = !!validationError;
        observationComplete = !invalid;
        const mounted = receipts.filter((item) => item.phase === 'mounted');
        const lifetimeReceiptsComplete = wantedNames.every((name) =>
            mounted.some(
                (item) =>
                    item.owner?.name === name &&
                    [
                        'before-cancel-clear',
                        'after-cancel-clear',
                        'before-reset-handlers',
                        'after-reset-handlers',
                    ].every((boundary) =>
                        receipts.some(
                            (entry) =>
                                entry.phase === 'boundary' &&
                                entry.ownerId === item.owner.id &&
                                entry.boundary === boundary,
                        ),
                    ),
            ),
        );
        const finalOwnerIds = mounted
            .filter((item) => item.owner?.name === wantedNames.at(-1))
            .map((item) => item.owner.id);
        const finalNativeUnmountObserved =
            finalOwnerIds.length > 0 &&
            finalOwnerIds.every((id) => receipts.some((item) => item.phase === 'unmounted' && item.owner?.id === id));
        writeFileSync(
            path.join(directory, 'query-lifetime.json'),
            JSON.stringify(
                {
                    observationComplete,
                    invalid,
                    validationError,
                    mappingStatus: invalid ? 'INVALID' : 'PROVEN_UNIQUE',
                    lifetimeReceiptsComplete,
                    finalNativeUnmountObserved,
                    receipts,
                    acceptance: false,
                    limitation:
                        'Identical unbound dispatches invalidate correlation; no FIFO/current-case ownership or final unmount callback is invented.',
                },
                null,
                2,
            ),
            { flag: 'wx' },
        );
    } else if (generated) {
        const requests = observations.filter((item) => item.userDiagnostic === 'dispatch');
        observationComplete = userSequences[selection].every((name, index) => {
            const caseName = `Case ${index + 1}`;
            const own = requests.filter((item) => item.caseName === caseName);
            const tenant = own.filter((item) => item.path === '/service/useradmin/tenantadmins/search');
            const consultant = own.filter((item) => item.path === '/service/users/consultants/search');
            return name === 'TenantAdminsForPlatformAdmin'
                ? tenant.length > 0 &&
                      consultant.length === 0 &&
                      tenant.every(
                          (item) =>
                              item.route?.typeOfUsers === 'tenant-admins' &&
                              item.route?.pathname === '/admin/users/tenant-admins',
                      )
                : consultant.length > 0 && tenant.length === 0;
        });
        writeFileSync(
            path.join(directory, 'request-ownership.json'),
            JSON.stringify(
                {
                    observationComplete,
                    requests,
                    finalCallbackObserved: observations.some(
                        (item) => item.userDiagnostic === 'end' && item.caseName === `Case ${expectedCount}`,
                    ),
                    limitation:
                        'No final story callback is invented; observer lifetime ends with its fresh child process.',
                },
                null,
                2,
            ),
            { flag: 'wx' },
        );
    } else if (repairedRegression) {
        const run = runs.length === 1 ? path.join(directory, runs[0]) : undefined;
        const cases = run
            ? readFileSync(path.join(run, 'cases.jsonl'), 'utf8')
                  .trim()
                  .split('\n')
                  .map(JSON.parse)
                  .filter((item) => item.state !== 'skipped')
            : [];
        observationComplete =
            outcome.exitCode === 0 &&
            cases.length === 1 &&
            cases.every(
                (item) =>
                    item.state === 'passed' &&
                    (item.errors ?? []).length === 0 &&
                    (item.errorDetails ?? []).length === 0 &&
                    item.a11y?.profile === 'functional-pilot' &&
                    item.a11y?.auditCount === 0 &&
                    item.a11y?.reports?.length === 0 &&
                    item.a11y?.compliance?.execution === 'NOT_RUN' &&
                    item.a11y?.compliance?.status === 'DEFERRED' &&
                    item.a11y?.compliance?.reason === 'pilot scope',
            );
        writeFileSync(
            path.join(directory, 'repaired-regression.json'),
            JSON.stringify(
                {
                    observationComplete,
                    runtimeIntegration: checkFieldFormBackport(),
                    comparatorInterceptionRequested: false,
                    acceptance: false,
                },
                null,
                2,
            ),
            { flag: 'wx' },
        );
    } else if (tokenSelection) {
        const phases = observations.filter((item) => item.tokenDiagnostic === 'phase');
        observationComplete = (selection === 'token-whole-module' ? wantedNames.slice(0, 8) : wantedNames).every(
            (name) =>
                phases.some(
                    (item) =>
                        item.phase === 'play:after' &&
                        item.context?.locale === (name.endsWith('English') ? 'en' : 'de') &&
                        item.context?.primaryColor === (name.startsWith('Red') ? '#A5000A' : '#1D4ED8') &&
                        item.context?.scheme === (name.includes('Inverted') ? 'inverted' : 'light'),
                ),
        );
        writeFileSync(
            path.join(directory, 'token-phases.json'),
            JSON.stringify({ observationComplete, phases, acceptance: false }, null, 2),
            { flag: 'wx' },
        );
    } else {
        throw new Error('Unknown selected evidence kind');
    }
    const complete =
        observationComplete &&
        bindingsMatch &&
        inventory?.inventoryComplete === true &&
        inventory.executed === expectedCount &&
        sequenceMatches;
    writeFileSync(
        path.join(directory, 'outcome.json'),
        JSON.stringify(
            {
                ...outcome,
                timedOut,
                endedAtUTC: new Date().toISOString(),
                completeSelectedInventory: querySelection
                    ? bindingsMatch &&
                      inventory?.inventoryComplete === true &&
                      inventory.executed === expectedCount &&
                      sequenceMatches
                    : complete,
                ...(querySelection && { diagnosticObservationComplete: observationComplete }),
                diagnosticOmittedCases,
                acceptance: false,
                note: 'Diagnostic only; raw warning and normal verification failures retained.',
            },
            null,
            2,
        ),
        { flag: 'wx' },
    );
    console.info(
        JSON.stringify({ selection, ...outcome, timedOut, completeSelectedInventory: complete, acceptance: false }),
    );
    process.exitCode = !timedOut && complete && outcome.exitCode === 0 ? 0 : 1;
} finally {
    if (generated) {
        const unchanged = readFileSync(generated, 'utf8') === generatedBytes;
        if (unchanged) unlinkSync(generated);
        else process.exitCode = 1;
        writeFileSync(
            path.join(directory, 'cleanup.json'),
            JSON.stringify(
                {
                    ownedPath: generated,
                    removed: unchanged,
                    foreignBytesPreserved: !unchanged,
                    sourceAfterCleanup: sourceIdentity(process.cwd(), process.env.VERIFICATION_SOURCE_SHA),
                },
                null,
                2,
            ),
            { flag: 'wx' },
        );
    }
}
