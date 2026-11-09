import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import {
    createSnackbarApi,
    createSnackbarStore,
    resolveDuration,
    SNACKBAR_DEDUPE_WINDOW_MS,
    SNACKBAR_MAX_VISIBLE,
    type SnackbarSeverity,
} from './snackbarStore';

const setup = () => {
    let time = 1_000_000;
    const store = createSnackbarStore(() => time);
    const advance = (ms: number) => {
        time += ms;
    };
    return { store, api: createSnackbarApi(store), advance };
};

const messages = (items: readonly { message: unknown }[]) => items.map((item) => item.message);

describe('snackbar store: the stack', () => {
    it('stacks up to four pop-ups, oldest first, and queues the rest in order', () => {
        const { api, store } = setup();
        ['one', 'two', 'three', 'four', 'five', 'six'].forEach((text) => api.success(text));
        expect(SNACKBAR_MAX_VISIBLE).toBe(4);
        expect(messages(store.getState().visible)).toEqual(['one', 'two', 'three', 'four']);
        expect(store.getState().current?.message).toBe('one');
        expect(messages(store.getState().queued)).toEqual(['five', 'six']);
    });

    it('lets the next waiting pop-up move up, as the newest, when one goes', () => {
        const { api, store } = setup();
        const keys = ['one', 'two', 'three', 'four', 'five'].map((text) => api.success(text));
        store.close('timeout', keys[1]);
        expect(messages(store.getState().visible)).toEqual(['one', 'three', 'four', 'five']);
        expect(store.getState().queued).toHaveLength(0);
        store.close('dismiss');
        expect(messages(store.getState().visible)).toEqual(['three', 'four', 'five']);
    });

    it('needs a title: message is the same thing, and a description alone becomes the title', () => {
        const { api, store } = setup();
        api.notify({ title: 'Titel', description: 'Text' });
        api.notify({ message: 'Message', severity: 'warning' });
        api.notify({ description: 'Only text' } as never);
        expect(store.getState().visible.map((item) => [item.title, item.message])).toEqual([
            ['Titel', 'Titel'],
            ['Message', 'Message'],
            ['Only text', 'Only text'],
        ]);
    });

    it('keeps waiting errors when the queue overflows: other messages go first', () => {
        const { api, store } = setup();
        for (let i = 0; i < 4; i += 1) api.info(`shown${i}`);
        api.error('waiting error');
        for (let i = 0; i < 12; i += 1) api.info(`waiting${i}`);
        const queued = messages(store.getState().queued);
        expect(queued).toHaveLength(10);
        expect(queued[0]).toBe('waiting error');
        expect(queued).not.toContain('waiting0');
    });

    it('caps the queue and drops the oldest waiting message', () => {
        const { api, store } = setup();
        for (let i = 0; i < 20; i += 1) api.info(`m${i}`);
        expect(store.getState().visible).toHaveLength(4);
        expect(store.getState().queued).toHaveLength(10);
        expect(store.getState().queued[0].message).toBe('m10');
    });

    it('clears everything, visible and queued', () => {
        const { api, store } = setup();
        for (let i = 0; i < 6; i += 1) api.info(`m${i}`);
        api.clear();
        expect(store.getState()).toEqual({ current: undefined, visible: [], queued: [] });
    });

    it('dismisses a queued pop-up by key without touching the stack', () => {
        const { api, store } = setup();
        const keys = ['a', 'b', 'c', 'd', 'e'].map((text) => api.info(text));
        api.dismiss(keys[4]);
        expect(store.getState().queued).toHaveLength(0);
        expect(messages(store.getState().visible)).toEqual(['a', 'b', 'c', 'd']);
    });
});

describe('snackbar store: identity', () => {
    it('collapses a burst of identical messages into one, never a duplicate', () => {
        const { api, store } = setup();
        for (let i = 0; i < 5; i += 1) api.error('Es ist ein Fehler aufgetreten.');
        expect(messages(store.getState().visible)).toEqual(['Es ist ein Fehler aufgetreten.']);
        expect(store.getState().queued).toHaveLength(0);
    });

    it('treats the same text as new again only after the dedupe window once it timed out', () => {
        const { api, store, advance } = setup();
        api.success('Saved');
        store.close('timeout');
        advance(SNACKBAR_DEDUPE_WINDOW_MS - 1);
        api.success('Saved');
        expect(store.getState().visible).toHaveLength(0);
        advance(2);
        api.success('Saved');
        expect(store.getState().current?.message).toBe('Saved');
    });

    it('shows an error again when the person already closed it and it happens again', () => {
        const { api, store } = setup();
        api.error('Failed');
        store.close('dismiss');
        api.error('Failed');
        expect(store.getState().current?.message).toBe('Failed');
    });

    it('does not merge different severities or texts', () => {
        const { api, store } = setup();
        api.error('Saved');
        api.success('Saved');
        api.error('Saved!');
        expect(store.getState().visible).toHaveLength(3);
    });

    it('tells element messages apart by the words they show, and still collapses identical ones', () => {
        const { api, store } = setup();
        api.error(createElement('b', null, 'Save failed'));
        api.error(createElement('b', null, 'Delete failed'));
        api.error(createElement('b', null, 'Save failed'));
        expect(store.getState().visible).toHaveLength(2);
    });

    it('never merges element messages that show no words of their own', () => {
        const { api, store } = setup();
        api.error(createElement('i'));
        api.error(createElement('u'));
        expect(store.getState().visible).toHaveLength(2);
    });

    it('does not merge word-less element titles that share a description', () => {
        const { api, store } = setup();
        api.error({ title: createElement('i'), description: 'Please retry' });
        api.error({ title: createElement('u'), description: 'Please retry' });
        expect(store.getState().visible).toHaveLength(2);
    });

    it('lets an explicit key replace the text of the visible pop-up, in the same place', () => {
        const { api, store } = setup();
        api.error({ message: 'Session ends', key: 'session' });
        api.info('Other');
        api.error({ message: 'Session ended', key: 'session' });
        expect(messages(store.getState().visible)).toEqual(['Session ended', 'Other']);
    });

    it('only closes the pop-up a stale timer was started for', () => {
        const { api, store } = setup();
        const one = api.info('one');
        api.info('two');
        store.close('timeout', one);
        expect(messages(store.getState().visible)).toEqual(['two']);
        store.close('timeout', one);
        expect(messages(store.getState().visible)).toEqual(['two']);
    });

    it('reports why a pop-up closed', () => {
        const { api, store } = setup();
        const onClose = vi.fn();
        api.notify({ message: 'bye', onClose });
        store.close('action');
        expect(onClose).toHaveBeenCalledWith('action');
    });

    it.each([
        ['visible', 0],
        ['queued', 4],
    ])('treats a shared onClose the same way when the replaced pop-up is %s', (_where, fillers) => {
        const { api, store } = setup();
        const onClose = vi.fn();
        // Four fillers fill the stack, so the next message waits in the queue.
        Array.from({ length: fillers }, (_, i) => api.info(`filler ${i}`));
        api.notify({ message: 'same', key: 'same', onClose });
        api.notify({ message: 'same, newer', key: 'same', onClose });
        // The same function is carried over: it fires once, when the replacement goes.
        expect(onClose).not.toHaveBeenCalled();
        api.notify({ message: 'same, newest', key: 'same', onClose: vi.fn() });
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledWith('replaced');
        expect(store.getState().visible.length + store.getState().queued.length).toBe(fillers + 1);
    });
});

describe('snackbar store: the antd call shape', () => {
    it('keeps content, notification message, seconds', () => {
        const { api, store } = setup();
        api.error({ content: 'from message.error', duration: 8 });
        expect(store.getState().current).toMatchObject({
            message: 'from message.error',
            title: 'from message.error',
            severity: 'error',
            durationMs: null,
        });
        api.success({ message: 'from notification.success', description: 'more', duration: 5 });
        expect(store.getState().visible[1]).toMatchObject({
            message: 'from notification.success',
            description: 'more',
            durationMs: 5000,
        });
        api.warning('same as warning');
        expect(store.getState().visible[2].severity).toBe('warning');
    });

    it('takes a title in the sugar calls too', () => {
        const { api, store } = setup();
        api.error({ title: 'Titel', description: 'Text' });
        expect(store.getState().current).toMatchObject({ title: 'Titel', description: 'Text' });
    });

    it('accepts a bare React node as the message, as antd did', () => {
        const { api, store } = setup();
        const node = createElement('b', null, 'bold');
        api.success(node);
        expect(store.getState().current).toMatchObject({ message: node, severity: 'success' });
    });

    it('pulls legacy seconds of success and info into 4 to 6 seconds, and ignores them for the rest', () => {
        const { api, store } = setup();
        api.success({ message: 'short', duration: 3 });
        expect(store.getState().current?.durationMs).toBe(4000);
        api.info({ message: 'long', duration: 30 });
        expect(store.getState().visible[1].durationMs).toBe(6000);
        api.error({ message: 'seconds are ignored', duration: 3 });
        expect(store.getState().visible[2].durationMs).toBeNull();
    });

    it('treats duration 0 as persistent', () => {
        const { api, store } = setup();
        api.info({ message: 'stays', duration: 0 });
        expect(store.getState().current?.durationMs).toBeNull();
    });
});

describe('snackbar timing (fake timers)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    // The store has no timers of its own; the host owns them. This pins the contract the host reads.
    it.each<SnackbarSeverity>(['error', 'warning'])(
        '%s pop-ups carry no time limit, however long you wait',
        (severity) => {
            const { api, store } = setup();
            api.notify({ message: 'stays', severity, durationMs: 4000 });
            vi.advanceTimersByTime(10 * 60 * 1000);
            expect(store.getState().current).toMatchObject({ message: 'stays', durationMs: null });
        },
    );
});

describe('resolveDuration', () => {
    it('lets only success and info time out, 4 to 6 seconds', () => {
        expect(resolveDuration({ message: 'ok', severity: 'success' })).toBe(4000);
        expect(resolveDuration({ message: 'ok' })).toBe(4000);
        expect(resolveDuration({ title: 'x'.repeat(400), severity: 'info' })).toBe(6000);
        expect(resolveDuration({ message: 'ok', severity: 'success', durationMs: 2500 })).toBe(4000);
        expect(resolveDuration({ message: 'ok', severity: 'success', durationMs: 60_000 })).toBe(6000);
    });

    it('never times out an error, a warning or anything with an action or a jump', () => {
        const action = { label: 'Undo', onClick: () => undefined };
        expect(resolveDuration({ message: 'ok', severity: 'error' })).toBeNull();
        expect(resolveDuration({ message: 'ok', severity: 'error', durationMs: 4000 })).toBeNull();
        expect(resolveDuration({ message: 'ok', severity: 'warning' })).toBeNull();
        expect(resolveDuration({ message: 'ok', severity: 'error', action })).toBeNull();
        expect(resolveDuration({ message: 'ok', severity: 'success', action })).toBeNull();
        expect(resolveDuration({ message: 'ok', action })).toBeNull();
        expect(resolveDuration({ message: 'ok', secondaryAction: action })).toBeNull();
        expect(resolveDuration({ message: 'ok', severity: 'success', jump: 'tile' })).toBeNull();
    });

    it('stays when asked for, success and info included', () => {
        expect(resolveDuration({ message: 'ok', persistent: true })).toBeNull();
        expect(resolveDuration({ message: 'ok', durationMs: 0 })).toBeNull();
    });
});

describe('cause key', () => {
    it('shows one pop-up when six cards fail for one cause', () => {
        const { api, store } = setup();
        ['a', 'b', 'c', 'd', 'e', 'f'].forEach((id) =>
            api.notify({ title: `Card ${id} failed`, severity: 'error', causeKey: 'tenant-api-down' }),
        );
        expect(store.getState().visible).toHaveLength(1);
        expect(store.getState().queued).toHaveLength(0);
        expect(store.getState().current).toMatchObject({ message: 'Card a failed', causeKey: 'tenant-api-down' });
    });

    it('does not collapse different causes', () => {
        const { api, store } = setup();
        api.notify({ message: 'one', severity: 'error', causeKey: 'cause-1' });
        api.notify({ message: 'two', severity: 'error', causeKey: 'cause-2' });
        expect(messages(store.getState().visible)).toEqual(['one', 'two']);
    });

    it('also holds back a cause that is waiting in the queue', () => {
        const { api, store } = setup();
        ['a', 'b', 'c', 'd'].forEach((text) => api.info(text));
        api.notify({ message: 'waits', severity: 'error', causeKey: 'outage' });
        api.notify({ message: 'same outage', severity: 'error', causeKey: 'outage' });
        expect(messages(store.getState().queued)).toEqual(['waits']);
    });

    it('keeps one cause quiet for the dedupe window after a timeout, then lets it through again', () => {
        const { api, store, advance } = setup();
        api.notify({ message: 'saved', severity: 'success', causeKey: 'save' });
        store.close('timeout');
        advance(SNACKBAR_DEDUPE_WINDOW_MS - 1);
        api.notify({ message: 'saved again', severity: 'success', causeKey: 'save' });
        expect(store.getState().visible).toHaveLength(0);
        advance(2);
        api.notify({ message: 'saved again', severity: 'success', causeKey: 'save' });
        expect(store.getState().current?.message).toBe('saved again');
    });

    it('shows the cause again once the person dismissed it', () => {
        const { api, store } = setup();
        api.notify({ message: 'down', severity: 'error', causeKey: 'outage' });
        store.close('dismiss');
        api.notify({ message: 'down', severity: 'error', causeKey: 'outage' });
        expect(store.getState().current?.message).toBe('down');
    });
});

describe('jump and actions', () => {
    it('normalises a bare jump target and keeps a full jump as given', () => {
        const { api, store } = setup();
        const onJump = vi.fn();
        api.notify({ message: 'a', jump: 'tile-a' });
        api.notify({ message: 'b', jump: { target: '#b', label: 'Öffnen', onJump } });
        expect(store.getState().visible[0].jump).toEqual({ target: 'tile-a' });
        expect(store.getState().visible[1].jump).toEqual({ target: '#b', label: 'Öffnen', onJump });
    });

    it('carries a second action and a test id through to the pop-up', () => {
        const { api, store } = setup();
        const action = { label: 'Neuen behalten', onClick: () => undefined };
        const secondaryAction = { label: 'Alten behalten', onClick: () => undefined };
        api.notify({ message: 'Zwei Entwürfe', action, secondaryAction, testId: 'draft-choice' });
        expect(store.getState().current).toMatchObject({
            action,
            secondaryAction,
            testId: 'draft-choice',
            durationMs: null,
        });
    });
});
