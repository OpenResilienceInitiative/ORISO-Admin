import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { sourceIdentity } from './verification-provenance.mjs';

// Trusted parent capsule: invocationId, phase, shuffle, strict profile and exact
// sourceIdentity. Reporter runId is established only inside this exclusive root.
export const allocateControlInvocation = (parent, invocationId = randomUUID()) => {
    mkdirSync(parent, { recursive: true });
    const directory = path.join(parent, `invocation-${invocationId}`);
    mkdirSync(directory);
    return { directory, invocationId };
};
export const allocateControlPhase = (invocation, phase, shuffle = false) => {
    assert.ok(['capture', 'verify'].includes(phase), 'Unsupported control phase');
    assert.equal(typeof shuffle, 'boolean');
    const directory = path.join(invocation.directory, phase + (shuffle ? '-shuffled' : ''));
    mkdirSync(directory);
    const capsule = {
        invocationId: invocation.invocationId,
        phase,
        shuffle,
        profile: 'strict',
        source: sourceIdentity(process.cwd(), process.env.VERIFICATION_SOURCE_SHA),
    };
    writeFileSync(path.join(directory, 'expectation.json'), JSON.stringify(capsule, null, 2), { flag: 'wx' });
    return { directory, capsule };
};
