import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { diagnosticCaseOrder } from './diagnostic-case-order.mjs';

const target = {
    group: 'CounsellorInvitesTab — platform admin picks an existing agency first',
    title: 'fills the empty Träger from the picked agency and keeps both after "Senden & nächste"',
};
const predecessor = {
    group: 'CounsellorInvitesTab for a restricted agency admin',
    title: 'with more than 10 own agencies: the 11th and 12th are reachable via "Weitere anzeigen"',
};
const selections = { 'invite-target-alone': [target], 'invite-predecessor-target': [predecessor, target] };
const selection = process.argv[2];
assert.ok(Object.hasOwn(selections, selection), 'Unknown invite diagnostic selection');
const directory = path.resolve('verification-artifacts/invite-diagnostic');
const expected = selections[selection];
const input = JSON.parse(readFileSync(path.join(directory, 'input.json'), 'utf8'));
assert.equal(input.selection, selection, 'Invite diagnostic input selection mismatch');
const runs = readdirSync(directory).filter((name) => name.startsWith('run-'));
assert.equal(runs.length, 1, 'Exactly one native diagnostic run required');
const run = path.join(directory, runs[0]);
const inventory = JSON.parse(readFileSync(path.join(run, 'inventory.json'), 'utf8'));
const provenance = JSON.parse(readFileSync(path.join(run, 'provenance.json'), 'utf8'));
const cases = readFileSync(path.join(run, 'cases.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
const events = readFileSync(path.join(run, 'events.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
const executed = cases.filter((item) => ['passed', 'failed'].includes(item.state));
const names = expected.map((item) => `${item.group} > ${item.title}`);
let actualOrder, expectedOrder, orderError;
try {
    const ordering = diagnosticCaseOrder(events, cases, names);
    actualOrder = ordering.actual;
    expectedOrder = ordering.expected;
} catch (error) {
    orderError = error.message;
}
const nativeAll = JSON.parse(readFileSync(path.join(directory, 'native.json'), 'utf8')).testResults.flatMap(
    (suite) => suite.assertionResults,
);
const native = nativeAll.filter((item) => ['passed', 'failed'].includes(item.status));
const trace = readFileSync(path.join(directory, 'trace.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(JSON.parse)
    .filter((item) => item.caseName === 'platform admin: picked existing agency and next');
const reference = { path: 'provenance.json', runId: provenance.runId };
const checks = {
    selectedCases: JSON.stringify(executed.map((item) => item.name)) === JSON.stringify(names),
    nativeSelectedCases:
        native.length === expected.length &&
        native.every(
            (item, index) =>
                item.title === expected[index].title && item.ancestorTitles.join(' > ') === expected[index].group,
        ),
    nativeAccounting:
        nativeAll.length === cases.length &&
        nativeAll.every((item) => {
            const name = [...item.ancestorTitles, item.title].join(' > ');
            const matching = cases.filter((record) => record.name === name);
            return (
                matching.length === 1 &&
                (matching[0].state === 'skipped'
                    ? item.status === 'skipped' && (item.failureMessages ?? []).length === 0
                    : item.status === matching[0].state)
            );
        }),
    order: !orderError,
    source: JSON.stringify(provenance.source) === JSON.stringify(input.source),
    profile: provenance.profile === 'strict',
    run:
        JSON.stringify(inventory.provenance) === JSON.stringify(reference) &&
        cases.every((item) => JSON.stringify(item.provenance) === JSON.stringify(reference)),
    completeInventory:
        inventory.inventoryComplete === true &&
        inventory.executed === expected.length &&
        inventory.afterPool.status === 'checked',
    targetTrace:
        trace.length > 0 && trace[0].phase === 'render:before' && trace.some((item) => item.phase === 'test:finished'),
};
writeFileSync(
    path.join(directory, 'diagnostic-validation.json'),
    JSON.stringify(
        {
            selection,
            acceptance: false,
            checks,
            actualOrder,
            expectedOrder,
            orderError,
            tracePhases: trace.map((item) => ({ phase: item.phase, elapsedMs: item.elapsedMs })),
            omittedCases: cases.filter((item) => item.state === 'skipped').map((item) => item.name),
        },
        null,
        2,
    ),
    { flag: 'wx' },
);
assert.ok(Object.values(checks).every(Boolean), 'Incomplete invite diagnostic evidence; inspect validation receipt');
