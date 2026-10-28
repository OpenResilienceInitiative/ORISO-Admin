// @vitest-environment node
import { afterEach, expect, it, vi } from 'vite-plus/test';
import { beginFixtureDiagnostic } from './story-fixture-diagnostic';

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

it('has no console mutation without an explicit diagnostic selection', () => {
    vi.stubEnv('VITE_ORISO_FIXTURE_DIAGNOSTIC', '');
    const sink = console.error;
    beginFixtureDiagnostic('deadline-warning')();
    expect(console.error).toBe(sink);
});
it('fails closed on unknown diagnostic selections', () => {
    vi.stubEnv('VITE_ORISO_FIXTURE_DIAGNOSTIC', 'all');
    expect(() => beginFixtureDiagnostic('deadline-warning')).toThrow('Unknown fixture diagnostic selection');
});
it('captures one bounded first-origin stack and forwards every original error', () => {
    vi.stubEnv('VITE_ORISO_FIXTURE_DIAGNOSTIC', 'deadline-warning');
    const sink = vi.spyOn(console, 'error').mockImplementation(() => {});
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const release = beginFixtureDiagnostic('deadline-warning');
    console.error('Warning: Warning: There may be circular references');
    console.error('Warning: Warning: There may be circular references');
    console.error('other failure');
    release();
    expect(console.error).toBe(sink);
    expect(sink).toHaveBeenCalledTimes(3);
    const observations = info.mock.calls.map(([message]) => JSON.parse(message));
    expect(observations.map((item) => item.fixtureDiagnostic)).toEqual(['begin', 'first-warning', 'end']);
    expect(observations[1].stack.length).toBeLessThanOrEqual(6000);
    expect(observations[2]).toMatchObject({ observed: true, sinkStillOwned: true });
});
