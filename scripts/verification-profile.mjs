import assert from 'node:assert/strict';

export const readVerificationProfile = (env = process.env) => {
    const value = env.ORISO_VERIFICATION_PROFILE === undefined ? 'strict' : env.ORISO_VERIFICATION_PROFILE;
    assert.ok(['strict', 'functional-pilot'].includes(value), 'Unsupported verification profile');
    return value;
};

// One closed contract shared by allocation, Node configuration, provenance and acceptance.
export const validateControlCapsule = (capsule) => {
    assert.ok(capsule?.invocationId, 'Trusted current invocation expectation required');
    readVerificationProfile({ ORISO_VERIFICATION_PROFILE: capsule.profile });
    assert.ok(capsule.profile, 'Explicit capsule profile required');
    assert.equal(typeof capsule.shuffle, 'boolean');
    assert.ok(capsule.source?.revision && capsule.source?.snapshot?.digest, 'Exact source identity required');
    if (capsule.selection === 'controls20') {
        assert.ok(['capture', 'verify'].includes(capsule.phase), 'Unsupported control phase');
        assert.ok(
            capsule.phase !== 'capture' || (capsule.profile === 'strict' && !capsule.shuffle),
            'Capture is strict only',
        );
        assert.equal(capsule.witness, undefined, 'Control suite cannot configure a witness');
    } else {
        assert.equal(capsule.selection, 'axe-witness1', 'Unsupported control selection');
        assert.equal(capsule.shuffle, false, 'Witness cannot shuffle');
        const phases = {
            'witness-positive': ['strict', 'attached'],
            'witness-functional': ['functional-pilot', 'attached'],
            'witness-disconnected': ['strict', 'disconnected-negative'],
        };
        assert.ok(Object.hasOwn(phases, capsule.phase), 'Unsupported witness phase');
        const witness = capsule.witness;
        assert.equal(witness?.contractVersion, 1, 'Unsupported witness contract');
        assert.ok(typeof witness.pairId === 'string' && witness.pairId.length > 0, 'Witness pair required');
        assert.deepEqual(
            [capsule.profile, witness.observation],
            phases[capsule.phase],
            'Invalid witness profile/observation',
        );
        for (const identity of [witness.addon, witness.axe]) {
            assert.ok(
                identity?.version && identity.resolvedRelativePath && /^[a-f0-9]{64}$/.test(identity.sha256),
                'Installed witness identity required',
            );
        }
        assert.equal(
            witness.addon.callsiteSignature,
            'axe.run(context, optionsWithDisabledRules)',
            'Unsupported installed callsite',
        );
    }
    return capsule;
};

export const readControlInvocation = (env = process.env) => {
    const profile = readVerificationProfile(env);
    if (env.ORISO_VERIFICATION_CONTROLS !== 'true') return undefined;
    const capsule = validateControlCapsule(JSON.parse(env.ORISO_CONTROL_INVOCATION_JSON || 'null'));
    assert.equal(capsule.profile, profile, 'Node/capsule profile mismatch');
    return capsule;
};
