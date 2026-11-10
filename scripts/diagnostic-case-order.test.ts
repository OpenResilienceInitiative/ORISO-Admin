// @vitest-environment node
import { expect, it } from 'vite-plus/test';
import { diagnosticCaseOrder } from './diagnostic-case-order.mjs';

// Source-qualified public event shape observed in run40712351331: filtered
// cases receive READY followed by RESULT(SKIPPED), including before selections.
const packet = () => {
    const cases = [
        { file: 'probe.ts', name: 'Omitted', state: 'skipped', errors: [] },
        { file: 'probe.ts', name: 'Selected', state: 'passed', errors: [] },
    ];
    const events = cases.flatMap((item) => [
        { file: item.file, name: item.name, event: 'ready' },
        { file: item.file, name: item.name, event: 'result', state: item.state },
    ]);
    return { cases, events };
};
it('accounts for the exact skipped READY/RESULT pair while retaining selected order', () => {
    const { cases, events } = packet();
    expect(diagnosticCaseOrder(events, cases, ['Selected'])).toEqual({
        actual: ['ready:Selected', 'result:Selected'],
        expected: ['ready:Selected', 'result:Selected'],
        omitted: ['Omitted'],
    });
});
it.each([
    'missing-skipped-result',
    'duplicate-skipped-ready',
    'skipped-error',
    'selected-skipped',
    'unselected-executed',
    'unmatched',
    'wrong-order',
    'mismatched-provenance',
])('fails closed on invalid diagnostic accounting: %s', (kind) => {
    const { cases, events } = packet();
    if (kind === 'missing-skipped-result') events.splice(1, 1);
    if (kind === 'duplicate-skipped-ready') events.unshift({ ...events[0] });
    if (kind === 'skipped-error') cases[0].errors.push('unexpected failure');
    if (kind === 'selected-skipped') {
        cases[1].state = 'skipped';
        events[3].state = 'skipped';
    }
    if (kind === 'unselected-executed') {
        cases[0].state = 'passed';
        events[1].state = 'passed';
    }
    if (kind === 'unmatched') events.push({ file: 'other.ts', name: 'Other', event: 'ready' });
    if (kind === 'wrong-order') events.reverse();
    if (kind === 'mismatched-provenance') Object.assign(events[0], { provenance: { runId: 'other' } });
    expect(() => diagnosticCaseOrder(events, cases, ['Selected'])).toThrow();
});
