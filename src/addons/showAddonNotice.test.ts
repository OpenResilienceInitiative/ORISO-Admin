import { describe, expect, it, vi } from 'vitest';
import type { message } from 'antd';
import { showAddonNotice } from './useAddonHostProps';

const fakeMessage = () => {
    const calls: Array<[string, unknown]> = [];
    const record = (type: string) => (args: unknown) => {
        calls.push([type, args]);
        return undefined;
    };
    const show = {
        success: vi.fn(record('success')),
        info: vi.fn(record('info')),
        warning: vi.fn(record('warning')),
        error: vi.fn(record('error')),
    } as unknown as typeof message;
    return { show, calls };
};

describe('showAddonNotice', () => {
    it('shows a success message with the title in front', () => {
        const { show, calls } = fakeMessage();
        showAddonNotice({ type: 'success', text: 'Gespeichert', title: 'Ziele' }, show);
        expect(calls).toEqual([['success', { content: 'Ziele: Gespeichert', duration: 4 }]]);
    });

    it('keeps errors longer', () => {
        const { show, calls } = fakeMessage();
        showAddonNotice({ type: 'error', text: 'Fehler' }, show);
        expect(calls).toEqual([['error', { content: 'Fehler', duration: 8 }]]);
    });

    it('treats unknown types as info, cuts long text and ignores empty messages', () => {
        const { show, calls } = fakeMessage();
        showAddonNotice({ type: 'shout' as never, text: 'x'.repeat(400) }, show);
        showAddonNotice({ type: 'info', text: '' }, show);
        expect(calls).toHaveLength(1);
        expect(calls[0][0]).toBe('info');
        expect((calls[0][1] as { content: string }).content).toHaveLength(300);
    });
});
