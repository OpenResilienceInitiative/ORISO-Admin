import { setProjectAnnotations } from 'storybook/internal/preview-api';
import { renderToCanvas } from '@storybook/react/entry-preview';
import { getProjectAnnotations } from 'virtual:/@storybook/builder-vite/project-annotations.js';
import { storyRenderCleanup, type NativeStoryRenderer } from './storyRenderCleanup';
import { beforeEach, afterEach } from 'vite-plus/test';
import { captureVerificationBrowser } from './axeWitness';
import { a11yVerification } from './a11yVerification';
import { finishStoryVerification } from './verification';

// Explicitly preserve the builder's complete composed annotations (including a11y and MSW).
// This capture is installed only in Vitest, so normal Storybook UI rendering remains native.
const capturedNativeRenderer: NativeStoryRenderer = async (context, canvas) => {
    const teardown = await renderToCanvas(context, canvas);
    if (typeof teardown !== 'function') throw new Error('Native Storybook renderer returned no teardown');
    return storyRenderCleanup.retain(teardown);
};
setProjectAnnotations([getProjectAnnotations(), { renderToCanvas: capturedNativeRenderer }]);

beforeEach(({ task }) => {
    Object.assign(task.meta, { verificationBrowser: captureVerificationBrowser() });
});

// Assert in the current test. Story cleanup alone runs when the next story
// starts, which would attribute an error to the wrong story and leak state.
afterEach(async ({ task }) => {
    const errors: unknown[] = [];
    try {
        a11yVerification.finish((evidence) => {
            Object.assign(task.meta, { verificationA11y: evidence });
        });
    } catch (error) {
        errors.push(error);
    }
    try {
        await finishStoryVerification();
    } catch (error) {
        errors.push(error);
    }
    if (errors.length) throw new AggregateError(errors, errors.map(String).join('\n'));
});
