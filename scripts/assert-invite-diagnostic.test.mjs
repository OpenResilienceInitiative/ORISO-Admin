// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { expect, it } from 'vite-plus/test';

const group = 'CounsellorInvitesTab — platform admin picks an existing agency first';
const title = 'fills the empty Träger from the picked agency and keeps both after "Senden & nächste"';
const validator = path.resolve('scripts/assert-invite-diagnostic.mjs');
const fixture = (kind) => {
    const root = mkdtempSync(path.join(tmpdir(), 'invite-packet-'));
    const folder = path.join(root, 'verification-artifacts/invite-diagnostic');
    const run = path.join(folder, 'run-fixture');
    mkdirSync(run, { recursive: true });
    const provenance = { path: 'provenance.json', runId: 'current' };
    const source = { revision: 'fixture' };
    const cases = [
        { file: 'test.ts', name: 'Omitted > Filtered', state: 'skipped', errors: [], provenance },
        { file: 'test.ts', name: `${group} > ${title}`, state: 'passed', errors: [], provenance },
    ];
    const events = cases.flatMap((item) => [
        { file: item.file, name: item.name, event: 'ready', provenance },
        { file: item.file, name: item.name, event: 'result', state: item.state, provenance },
    ]);
    const native = [
        { ancestorTitles: ['Omitted'], title: 'Filtered', status: 'skipped', failureMessages: [] },
        { ancestorTitles: [group], title, status: 'passed', failureMessages: [] },
    ];
    if (kind === 'native-skipped-error') native[0].failureMessages.push('extra failure');
    if (kind === 'native-skipped-state') native[0].status = 'failed';
    if (kind === 'event-extra') events.unshift({ ...events[0] });
    const put = (file, value) => writeFileSync(path.join(folder, file), JSON.stringify(value));
    put('input.json', { selection: 'invite-target-alone', source });
    put('native.json', { testResults: [{ assertionResults: native }] });
    put('run-fixture/provenance.json', { source, profile: 'strict', runId: 'current' });
    put('run-fixture/inventory.json', {
        provenance,
        inventoryComplete: true,
        executed: 1,
        afterPool: { status: 'checked' },
    });
    writeFileSync(path.join(run, 'cases.jsonl'), cases.map(JSON.stringify).join('\n'));
    writeFileSync(path.join(run, 'events.jsonl'), events.map(JSON.stringify).join('\n'));
    writeFileSync(
        path.join(folder, 'trace.jsonl'),
        ['render:before', 'test:finished']
            .map((phase) => JSON.stringify({ phase, caseName: 'platform admin: picked existing agency and next' }))
            .join('\n'),
    );
    return root;
};
it.each(['healthy', 'native-skipped-error', 'native-skipped-state', 'event-extra'])(
    'validates complete native selected and skipped evidence: %s',
    (kind) => {
        const root = fixture(kind);
        try {
            const child = spawnSync(process.execPath, [validator, 'invite-target-alone'], {
                cwd: root,
                encoding: 'utf8',
            });
            expect(child.error).toBeUndefined();
            expect(child.status, child.stderr).toBe(kind === 'healthy' ? 0 : 1);
        } finally {
            rmSync(root, { recursive: true });
        }
    },
);
