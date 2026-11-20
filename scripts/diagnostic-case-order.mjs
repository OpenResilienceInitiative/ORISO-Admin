import assert from 'node:assert/strict';

// Public Vitest READY also occurs for filtered SKIPPED cases. Those identities
// must have an exact skipped terminal result; they are not selected executions.
export const diagnosticCaseOrder = (events, cases, selectedNames) => {
    const key = (value) => JSON.stringify([value.file, value.name]);
    const records = new Map(cases.map((value) => [key(value), value]));
    assert.equal(records.size, cases.length, 'Duplicate diagnostic case identity');
    const relevant = events.filter((value) => ['ready', 'result'].includes(value.event));
    for (const event of relevant) {
        assert.ok(records.has(key(event)), 'Unmatched diagnostic case event');
        assert.deepEqual(event.provenance, records.get(key(event)).provenance, 'Diagnostic event provenance mismatch');
    }
    const omitted = [];
    for (const record of cases) {
        assert.ok(['passed', 'failed', 'skipped'].includes(record.state), 'Unknown diagnostic case state');
        const own = relevant.filter((value) => key(value) === key(record));
        assert.deepEqual(
            own.map((value) => value.event),
            ['ready', 'result'],
            'Missing or duplicate diagnostic case events',
        );
        assert.equal(own[1].state, record.state, 'Diagnostic terminal state mismatch');
        assert.equal(record.retries ?? 0, 0, 'Diagnostic retries invalidate observation');
        if (record.state === 'skipped') {
            assert.ok(!selectedNames.includes(record.name), 'Selected diagnostic case was skipped');
            assert.deepEqual(record.errors ?? [], [], 'Skipped diagnostic case has errors');
            assert.deepEqual(record.errorDetails ?? [], [], 'Skipped diagnostic case has structured errors');
            omitted.push(record.name);
        } else assert.ok(selectedNames.includes(record.name), 'Unselected diagnostic case executed');
    }
    assert.deepEqual(
        cases.filter((value) => value.state !== 'skipped').map((value) => value.name),
        selectedNames,
        'Selected diagnostic case inventory mismatch',
    );
    const actual = relevant
        .filter((value) => records.get(key(value)).state !== 'skipped')
        .map((value) => `${value.event}:${value.name}`);
    const expected = selectedNames.flatMap((name) => [`ready:${name}`, `result:${name}`]);
    assert.deepEqual(actual, expected, 'Selected diagnostic case order mismatch');
    return { actual, expected, omitted };
};
