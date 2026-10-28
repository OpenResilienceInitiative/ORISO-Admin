import React, { useEffect } from 'react';
import { composeStory } from '@storybook/react-vite';
// eslint-disable-next-line import/no-extraneous-dependencies -- Shipped renderer export of the pinned react-vite framework.
import { renderToCanvas } from '@storybook/react/entry-preview';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { expect, it, vi } from 'vite-plus/test';
import { createStoryRenderCleanup, type NativeStoryRenderer } from '../../.storybook/storyRenderCleanup';
import { beginStoryVerification } from '../../.storybook/verification';

const specimen = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    let mounted = false;
    let effects = 0;
    const Probe = () => {
        useQuery({ queryKey: ['native-render-lifetime'], queryFn: async () => ({ ready: true }) });
        useEffect(() => {
            mounted = true;
            return () => {
                mounted = false;
                effects += 1;
            };
        }, []);
        return <div>Real mounted query observer</div>;
    };
    const render = () => (
        <QueryClientProvider client={client}>
            <Probe />
        </QueryClientProvider>
    );
    return {
        client,
        render,
        mounted: () => mounted,
        effects: () => effects,
        observers: () =>
            client
                .getQueryCache()
                .find({ queryKey: ['native-render-lifetime'] })
                ?.getObserversCount() ?? 0,
    };
};

it('awaits native ACT teardown before explicit clear, once across deferred next-story cleanup and last story', async () => {
    const cleanup = createStoryRenderCleanup();
    const first = specimen();
    const second = specimen();
    let nativeCalls = 0;
    const renderer: NativeStoryRenderer = async (context, canvas) => {
        const native = await renderToCanvas(context, canvas);
        if (typeof native !== 'function') throw new Error('Missing native teardown');
        return cleanup.retain(async () => {
            nativeCalls += 1;
            await native();
        });
    };
    const canvas = document.createElement('div');
    document.body.append(canvas);
    try {
        const story = composeStory(
            { render: first.render },
            { title: 'Native cleanup/First' },
            { renderToCanvas: renderer },
        );
        await story.run({ canvasElement: canvas });
        expect(first.mounted()).toBe(true);
        expect(first.observers()).toBe(1);
        await cleanup.finish();
        expect(first.mounted()).toBe(false);
        expect(first.observers()).toBe(0);
        expect(canvas.childElementCount).toBe(0);
        first.client.clear();
        expect(nativeCalls).toBe(1);
        const next = composeStory(
            { render: second.render },
            { title: 'Native cleanup/Last' },
            { renderToCanvas: renderer },
        );
        await next.run({ canvasElement: canvas });
        expect(nativeCalls).toBe(1);
        expect(second.mounted()).toBe(true);
        await Promise.all([cleanup.finish(), cleanup.finish()]);
        expect(second.mounted()).toBe(false);
        expect(second.observers()).toBe(0);
        expect(second.effects()).toBe(1);
        expect(nativeCalls).toBe(2);
    } finally {
        await cleanup.finish();
        first.client.clear();
        second.client.clear();
        canvas.remove();
    }
});

it('still tears down the actual rendered tree when its play rejects', async () => {
    const cleanup = createStoryRenderCleanup();
    const view = specimen();
    const failure = new Error('original play failure');
    const renderer: NativeStoryRenderer = async (context, canvas) => {
        const native = await renderToCanvas(context, canvas);
        if (typeof native !== 'function') throw new Error('Missing native teardown');
        return cleanup.retain(native);
    };
    const canvas = document.createElement('div');
    document.body.append(canvas);
    try {
        const story = composeStory(
            {
                render: view.render,
                play: async () => {
                    throw failure;
                },
            },
            { title: 'Native cleanup/Failed play' },
            { renderToCanvas: renderer },
        );
        await expect(story.run({ canvasElement: canvas })).rejects.toBe(failure);
        expect(view.mounted()).toBe(true);
        await cleanup.finish();
        expect(view.mounted()).toBe(false);
        expect(view.observers()).toBe(0);
    } finally {
        await cleanup.finish();
        view.client.clear();
        canvas.remove();
    }
});

it('retains a once-only teardown rejection and all cleanup plus recorder failures', async () => {
    const cleanup = createStoryRenderCleanup();
    const nativeFailure = new Error('native teardown failure');
    const clearFailure = new Error('clear failure');
    const resetFailure = new Error('reset failure');
    const native = vi.fn(async () => {
        throw nativeFailure;
    });
    const returned = cleanup.retain(native);
    const clear = vi.fn(() => {
        throw clearFailure;
    });
    const reset = vi.fn(() => {
        throw resetFailure;
    });
    const sink = vi.spyOn(console, 'error').mockImplementation(() => {});
    const finish = beginStoryVerification([], async () => {
        const errors: unknown[] = [];
        try {
            await cleanup.finish();
        } catch (error) {
            errors.push(error);
        }
        try {
            clear();
        } catch (error) {
            errors.push(error);
        }
        try {
            reset();
        } catch (error) {
            errors.push(error);
        }
        if (errors.length) throw new AggregateError(errors, errors.map(String).join('\n'));
    });
    // eslint-disable-next-line no-console -- Exercise the retained sink and independent recorder failure.
    console.error('independent verification failure');
    try {
        let captured: unknown;
        try {
            await finish();
        } catch (error) {
            captured = error;
        }
        expect(captured).toBeInstanceOf(AggregateError);
        if (!(captured instanceof AggregateError)) throw new Error('Missing aggregate');
        expect(captured.errors[0]).toMatchObject({
            message: expect.stringContaining('independent verification failure'),
        });
        expect(captured.errors[1]).toBeInstanceOf(AggregateError);
        expect(captured.errors[1].errors).toEqual([nativeFailure, clearFailure, resetFailure]);
        await expect(cleanup.finish()).rejects.toBe(nativeFailure);
        await expect(returned()).rejects.toBe(nativeFailure);
        expect(native).toHaveBeenCalledTimes(1);
        expect(clear).toHaveBeenCalledTimes(1);
        expect(reset).toHaveBeenCalledTimes(1);
    } finally {
        sink.mockRestore();
    }
});
