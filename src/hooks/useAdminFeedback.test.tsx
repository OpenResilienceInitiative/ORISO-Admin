import { App } from 'antd';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vite-plus/test';
import { snackbar } from '../components/Snackbar';
import { snackbarStore } from '../components/Snackbar/snackbarStore';
import { useAdminFeedback } from './useAdminFeedback';

describe('admin feedback', () => {
    it('hands out the one snackbar channel as both message and notification', () => {
        let selected: ReturnType<typeof useAdminFeedback> | undefined;
        const Probe = () => {
            selected = useAdminFeedback();
            return null;
        };
        render(
            <App component={false}>
                <Probe />
            </App>,
        );
        expect(selected?.message).toBe(snackbar);
        expect(selected?.notification).toBe(snackbar);
        expect(typeof selected?.modal.confirm).toBe('function');
    });

    it('works outside antd App with the same channel and a static modal', () => {
        let selected: ReturnType<typeof useAdminFeedback> | undefined;
        const Probe = () => {
            selected = useAdminFeedback();
            return null;
        };
        render(<Probe />);
        expect(selected?.message).toBe(snackbar);
        expect(typeof selected?.modal.confirm).toBe('function');
    });

    it('a message raised through the hook reaches the store, with the antd call shape', async () => {
        const Raise = () => {
            const feedback = useAdminFeedback();
            return (
                <button type="button" onClick={() => feedback.message.error({ content: 'Feedback 1', duration: 8 })}>
                    Raise
                </button>
            );
        };
        render(<Raise />);
        await userEvent.click(screen.getByRole('button', { name: 'Raise' }));
        expect(snackbarStore.getState().current).toMatchObject({
            message: 'Feedback 1',
            severity: 'error',
            durationMs: null,
        });
    });
});
