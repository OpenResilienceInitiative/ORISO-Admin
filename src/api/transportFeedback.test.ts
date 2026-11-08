import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import type { ArgsProps } from 'antd/es/message/interface';
import { message } from 'antd';
import { captureTransportFeedback, registerTransportFeedbackOwner } from './transportFeedback';

vi.mock('antd', () => ({ message: { error: vi.fn() } }));

const owner = () => {
    const closes: ReturnType<typeof vi.fn>[] = [];
    const error = vi.fn<(notice: ArgsProps) => () => void>(() => {
        const close = vi.fn();
        closes.push(close);
        return close;
    });
    return { error, closes };
};

const disposers: (() => void)[] = [];
const install = (api: ReturnType<typeof owner>) => {
    const dispose = registerTransportFeedbackOwner(api);
    disposers.push(dispose);
    return dispose;
};

afterEach(async () => {
    disposers.splice(0).forEach((dispose) => dispose());
    await Promise.resolve();
    vi.clearAllMocks();
});

describe('request-origin transport feedback', () => {
    it('keeps a pre-provider request on its explicit static compatibility path', () => {
        const report = captureTransportFeedback();
        const api = owner();
        install(api);
        report({ content: 'Started before App', duration: 8 });
        expect(message.error).toHaveBeenCalledWith({ content: 'Started before App', duration: 8 });
        expect(api.error).not.toHaveBeenCalled();
    });

    it('expires A without notifying B and only closes notices created by A', async () => {
        const a = owner();
        const disposeA = install(a);
        const reportA = captureTransportFeedback();
        reportA({ content: 'A notice', duration: 8 });
        disposeA();
        disposeA();
        await Promise.resolve();
        expect(a.closes[0]).toHaveBeenCalledTimes(1);
        const b = owner();
        install(b);
        reportA({ content: 'Late A result', duration: 8 });
        captureTransportFeedback()({ content: 'B notice', duration: 8 });
        expect(a.error).toHaveBeenCalledTimes(1);
        expect(b.error).toHaveBeenCalledTimes(1);
        expect(b.error).toHaveBeenCalledWith(expect.objectContaining({ content: 'B notice', duration: 8 }));
        expect(message.error).not.toHaveBeenCalled();
    });

    it('rejects competing owners without replacing the current one', () => {
        const a = owner();
        const disposeA = install(a);
        const b = owner();
        expect(() => install(b)).toThrow('Transport feedback owner already registered');
        captureTransportFeedback()({ content: 'Still A' });
        expect(a.error).toHaveBeenCalledTimes(1);
        expect(b.error).not.toHaveBeenCalled();
        disposeA();
        install(b);
        disposeA();
        captureTransportFeedback()({ content: 'Now B' });
        expect(b.error).toHaveBeenCalledTimes(1);
    });

    it('keeps the session key and drops only the current notice when it closes', async () => {
        const api = owner();
        const dispose = install(api);
        const report = captureTransportFeedback();
        const closed = vi.fn();
        report({ key: 'session-expired', content: 'First', duration: 8, onClose: closed });
        report({ key: 'session-expired', content: 'Second', duration: 8 });
        api.error.mock.calls[0][0].onClose?.();
        expect(closed).toHaveBeenCalledTimes(1);
        dispose();
        await Promise.resolve();
        expect(api.closes[0]).not.toHaveBeenCalled();
        expect(api.closes[1]).toHaveBeenCalledTimes(1);
        expect(api.error.mock.calls[1][0].key).toBe('session-expired');
    });

    it('bounds records even before a batched holder reports its evictions', async () => {
        const api = owner();
        const dispose = install(api);
        const report = captureTransportFeedback();
        for (let index = 0; index < 100; index += 1) report({ content: `Batched ${index}` });
        expect(api.closes.filter((close) => close.mock.calls.length === 0)).toHaveLength(3);
        dispose();
        await Promise.resolve();
        expect(api.closes.every((close) => close.mock.calls.length === 1)).toBe(true);
    });

    it('does not let deferred cleanup close a same-holder successor session notice', async () => {
        const api = owner();
        const disposeA = install(api);
        captureTransportFeedback()({ key: 'session-expired', content: 'A' });
        disposeA();
        const disposeB = install(api);
        captureTransportFeedback()({ key: 'session-expired', content: 'B' });
        await Promise.resolve();
        expect(api.closes[0]).not.toHaveBeenCalled();
        expect(api.closes[1]).not.toHaveBeenCalled();
        disposeB();
        await Promise.resolve();
        expect(api.closes[1]).toHaveBeenCalledTimes(1);
    });

    it('forgets closed/evicted notices rather than retaining a growing history', async () => {
        const api = owner();
        const dispose = install(api);
        const report = captureTransportFeedback();
        for (let index = 0; index < 100; index += 1) {
            report({ content: `Completed ${index}` });
            api.error.mock.calls[index][0].onClose?.();
        }
        dispose();
        await Promise.resolve();
        expect(api.closes.every((close) => close.mock.calls.length === 0)).toBe(true);
    });
});
