import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export, invisible to the eslint import resolver
import { expect, within } from 'storybook/test';
import { popupsOf } from '../../test/storyPopups';
import { ErrorBoundary } from './index';

const Crashes = () => {
    throw new Error('Render error from the story');
};

/**
 * O2: a render error replaces the page with a full-screen fallback (role "alert"). It is a state of the
 * whole screen, not a notification: no pop-up, with a reload and a way back to the login.
 */
const meta = {
    title: 'Organisms/ErrorBoundary',
    component: ErrorBoundary,
    parameters: {
        layout: 'fullscreen',
        msw: { handlers: [http.post('*/service/error-reports', () => new HttpResponse(null, { status: 204 }))] },
    },
    args: { children: <Crashes /> },
    // The crash is the point of the story: React and the boundary log it, and the story harness expects the fallback.
    beforeEach: () => {
        // eslint-disable-next-line no-console -- Muted for this story only; restored in the cleanup below.
        const original = console.error;
        // eslint-disable-next-line no-console
        console.error = () => undefined;
        return () => {
            // eslint-disable-next-line no-console
            console.error = original;
        };
    },
} satisfies Meta<typeof ErrorBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RenderErrorFallback: Story = {
    parameters: {
        verification: {
            expectedErrors: [{ kind: 'fallback', message: 'A failure fallback replaced the story', count: 1 }],
        },
    },
    play: async ({ canvasElement }) => {
        const fallback = await within(canvasElement).findByRole('alert');
        await expect(within(fallback).getByRole('button')).toBeVisible();
        await expect(popupsOf(canvasElement)).toHaveLength(0);
    },
};
