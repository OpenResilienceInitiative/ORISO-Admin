import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

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
const actualOrder = events
    .filter((item) => ['ready', 'result'].includes(item.event) && item.state !== 'skipped')
    .map((item) => `${item.event}:${item.name}`);
const expectedOrder = names.flatMap((name) => [`ready:${name}`, `result:${name}`]);
const native = JSON.parse(readFileSync(path.join(directory, 'native.json'), 'utf8'))
    .testResults.flatMap((suite) => suite.assertionResults)
    .filter((item) => ['passed', 'failed'].includes(item.status));
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
    order: JSON.stringify(actualOrder) === JSON.stringify(expectedOrder),
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
            tracePhases: trace.map((item) => ({ phase: item.phase, elapsedMs: item.elapsedMs })),
            omittedCases: cases.filter((item) => item.state === 'skipped').map((item) => item.name),
        },
        null,
        2,
    ),
    { flag: 'wx' },
);
assert.ok(Object.values(checks).every(Boolean), 'Incomplete invite diagnostic evidence; inspect validation receipt');
