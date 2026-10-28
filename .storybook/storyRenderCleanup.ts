import type { ProjectAnnotations } from 'storybook/internal/types';
import type { ReactRenderer } from '@storybook/react';

export type NativeStoryRenderer = NonNullable<ProjectAnnotations<ReactRenderer>['renderToCanvas']>;
type NativeTeardown = Exclude<Awaited<ReturnType<NativeStoryRenderer>>, void>;

/** Retain the renderer's ACT-wrapped teardown; Storybook receives the same once-only callback. */
export const createStoryRenderCleanup = () => {
    let active: (() => Promise<void>) | undefined;
    return {
        retain(teardown: NativeTeardown) {
            let pending: Promise<void> | undefined;
            const once = () => (pending ??= Promise.resolve().then(teardown));
            active = once;
            return once;
        },
        async finish() {
            await active?.();
        },
    };
};
export const storyRenderCleanup = createStoryRenderCleanup();
