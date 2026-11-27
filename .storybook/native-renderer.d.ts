// Shipped Storybook10.6.3 exports checked against its ProjectAnnotations contract.
declare module '@storybook/react/entry-preview' {
    import type { ProjectAnnotations } from 'storybook/internal/types';
    import type { ReactRenderer } from '@storybook/react';
    export const renderToCanvas: NonNullable<ProjectAnnotations<ReactRenderer>['renderToCanvas']>;
}
declare module 'virtual:/@storybook/builder-vite/project-annotations.js' {
    import type { ProjectAnnotations } from 'storybook/internal/types';
    import type { ReactRenderer } from '@storybook/react';
    export function getProjectAnnotations(): ProjectAnnotations<ReactRenderer>;
}
