import { afterEach, expect, it, vi } from 'vite-plus/test';
import { markTokenDiagnostic } from './story-token-diagnostic';

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

it('keeps token phase markers inert in ordinary stories and validates closed selection', () => {
    vi.stubEnv('VITE_ORISO_TOKEN_DIAGNOSTIC', '');
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    markTokenDiagnostic('play:before');
    expect(info).not.toHaveBeenCalled();
    vi.stubEnv('VITE_ORISO_TOKEN_DIAGNOSTIC', 'all');
    expect(() => markTokenDiagnostic('play:before')).toThrow('Unknown token diagnostic selection');
    vi.stubEnv('VITE_ORISO_TOKEN_DIAGNOSTIC', 'token-blue-alone');
    markTokenDiagnostic('play:before', { primaryColor: '#1D4ED8', scheme: 'inverted', locale: 'en' });
    expect(JSON.parse(info.mock.calls[0][0])).toMatchObject({
        tokenDiagnostic: 'phase',
        selection: 'token-blue-alone',
        phase: 'play:before',
        context: { locale: 'en' },
    });
});
