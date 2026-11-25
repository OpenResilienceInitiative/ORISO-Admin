import { afterEach, expect, it, vi } from 'vite-plus/test';
import { beginUserDiagnostic, observeUserDiagnosticRoute } from './story-user-diagnostic';

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});
it('retains fetch and records exact tenant ownership without exposing request headers', async () => {
    vi.stubEnv('VITE_ORISO_USER_SEQUENCE', 'error-tenant-error');
    const original = vi.spyOn(window, 'fetch').mockResolvedValue(new Response('{}'));
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const release = beginUserDiagnostic('Case 2');
    observeUserDiagnosticRoute('/admin/users/tenant-admins', 'tenant-admins');
    await window.fetch('/service/useradmin/tenantadmins/search?query=*', {
        headers: { Authorization: 'private-fixture' },
    });
    release();
    expect(window.fetch).toBe(original);
    expect(original).toHaveBeenCalledTimes(1);
    const messages = info.mock.calls.map(([message]) => JSON.parse(message));
    expect(JSON.stringify(messages)).not.toContain('private-fixture');
    expect(messages.find((item) => item.userDiagnostic === 'end')).toMatchObject({ tenantAdmins: 1, consultants: 0 });
});
it('keeps a consultant dispatch visible and rejects it in the tenant case', async () => {
    vi.stubEnv('VITE_ORISO_USER_SEQUENCE', 'tenant-error-tenant');
    const original = vi.spyOn(window, 'fetch').mockResolvedValue(new Response('{}'));
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const release = beginUserDiagnostic('Case 1');
    observeUserDiagnosticRoute('/admin/users/tenant-admins', 'tenant-admins');
    await window.fetch('/service/users/consultants/search?query=*');
    expect(() => release()).toThrow('route/request ownership invariant failed');
    expect(window.fetch).toBe(original);
    expect(original).toHaveBeenCalledTimes(1);
});
