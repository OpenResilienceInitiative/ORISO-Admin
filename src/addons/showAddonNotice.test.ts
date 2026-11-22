import { describe, expect, it, vi } from 'vite-plus/test';
import { showAddonNotice } from './useAddonHostProps';

const fakeSnackbar = () => {
    const notify = vi.fn(() => 'key');
    return { show: { notify }, notify };
};

describe('showAddonNotice', () => {
    it('shows the title as the pop-up title and the text below it', () => {
        const { show, notify } = fakeSnackbar();
        showAddonNotice({ type: 'success', text: 'Gespeichert', title: 'Ziele' }, show);
        expect(notify).toHaveBeenCalledWith({ severity: 'success', title: 'Ziele', description: 'Gespeichert' });
    });

    it('uses the text as the title when there is none', () => {
        const { show, notify } = fakeSnackbar();
        showAddonNotice({ type: 'error', text: 'Fehler' }, show);
        expect(notify).toHaveBeenCalledWith({ severity: 'error', title: 'Fehler' });
    });

    it('treats unknown types as info, cuts long text and ignores empty messages', () => {
        const { show, notify } = fakeSnackbar();
        showAddonNotice({ type: 'shout' as never, text: 'x'.repeat(400) }, show);
        showAddonNotice({ type: 'info', text: '' }, show);
        expect(notify).toHaveBeenCalledTimes(1);
        expect(notify).toHaveBeenCalledWith({ severity: 'info', title: 'x'.repeat(300) });
    });
});
