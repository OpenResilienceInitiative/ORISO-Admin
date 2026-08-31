import { beforeAll } from 'vitest';
import { setProjectAnnotations } from '@storybook/react-vite';

// Reuse the exact preview the Storybook UI renders with (antd theme, i18n,
// MSW loader, react-query, router) so a component test can never pass against
// a different environment than the one a human reviews in the browser.
import * as previewAnnotations from './preview';

const annotations = setProjectAnnotations([previewAnnotations]);

beforeAll(annotations.beforeAll);
