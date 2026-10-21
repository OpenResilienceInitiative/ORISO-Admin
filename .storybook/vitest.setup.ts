import { afterEach } from 'vite-plus/test';
import { a11yVerification } from './a11yVerification';
import { finishStoryVerification } from './verification';

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
