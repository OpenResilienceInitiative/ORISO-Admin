import { afterEach, beforeAll } from 'vitest';
import * as a11yAnnotations from '@storybook/addon-a11y/preview';
import { setProjectAnnotations } from '@storybook/react-vite';

// Reuse the exact preview the Storybook UI renders with (antd theme, i18n,
// MSW loader, react-query, router) so a component test can never pass against
// a different environment than the one a human reviews in the browser.
import * as previewAnnotations from './preview';

// Storybook restores its temporary animation pause only after annotation
// finalizers return. Throwing axe's assertion there leaves every later story
// frozen (dialogs cannot close and dropdowns linger). Keep the original axe
// check and report, then fail the same Vitest test after Storybook cleans up.
const pendingA11yFailures = new Map<string, { error: unknown }>();
const annotations = setProjectAnnotations([
    {
        ...a11yAnnotations,
        afterEach: async (context) => {
            try {
                await a11yAnnotations.afterEach(context);
            } catch (error) {
                pendingA11yFailures.set(context.id, { error });
            }
        },
    },
    previewAnnotations,
]);

afterEach(({ task }) => {
    // addon-vitest records this id before running the story. Keying by it
    // keeps failures with their own test even when contexts run in parallel.
    const storyId = 'storyId' in task.meta ? task.meta.storyId : undefined;
    if (typeof storyId !== 'string') {
        if (pendingA11yFailures.size) throw new Error('Accessibility failure has no owning Storybook test');
        return;
    }
    const failure = pendingA11yFailures.get(storyId);
    pendingA11yFailures.delete(storyId);
    if (failure) throw failure.error;
});

beforeAll(annotations.beforeAll);
