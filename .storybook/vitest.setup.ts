import { beforeEach, afterEach } from 'vite-plus/test';
import { captureVerificationBrowser } from './axeWitness';
import { a11yVerification } from './a11yVerification';
import { finishStoryVerification } from './verification';

// Storybook 11: addon-vitest applies the project annotations itself, so the
// Vitest-only renderer that retains the story teardown lives in .storybook/preview.tsx.

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
