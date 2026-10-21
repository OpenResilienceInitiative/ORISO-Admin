import { App, ConfigProvider, message, theme } from 'antd';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vite-plus/test';
import { adminMessageConfig } from '../constants/adminMessageConfig';
import { useAdminFeedback } from './useAdminFeedback';

const ThemedContent = () => {
    const { token } = theme.useToken();
    return <span>Themed feedback {token.colorSuccess}</span>;
};

const Feedback = () => {
    const feedback = useAdminFeedback();
    return (
        <button type="button" onClick={() => feedback.message.success(<ThemedContent />)}>
            Notify
        </button>
    );
};

describe('admin feedback context', () => {
    it('uses the installed App holder and its actual dynamic theme', async () => {
        const user = userEvent.setup();
        const error = vi.spyOn(console, 'error');
        try {
            render(
                <ConfigProvider prefixCls="scoped" theme={{ token: { colorSuccess: '#123456' } }}>
                    <App component={false}>
                        <Feedback />
                    </App>
                </ConfigProvider>,
            );
            await user.click(screen.getByRole('button', { name: 'Notify' }));
            const content = await screen.findByText('Themed feedback #123456');
            expect(content.closest('.scoped-message')).not.toBeNull();
            expect(error).not.toHaveBeenCalled();
        } finally {
            error.mockRestore();
        }
    });
    it('preserves the production top offset and three-message limit', async () => {
        const Burst = () => {
            const feedback = useAdminFeedback();
            return (
                <button
                    type="button"
                    onClick={() => {
                        for (let index = 1; index <= 4; index += 1)
                            feedback.message.error({ content: `Feedback ${index}`, duration: 8 });
                    }}
                >
                    Burst
                </button>
            );
        };
        render(
            <App component={false} message={adminMessageConfig}>
                <Burst />
            </App>,
        );
        await userEvent.click(screen.getByRole('button', { name: 'Burst' }));
        const last = await screen.findByText('Feedback 4');
        expect(last.closest('.ant-message')).toHaveStyle({ top: '100px' });
        expect(screen.queryByText('Feedback 1')).not.toBeInTheDocument();
        expect(document.querySelectorAll('.ant-message-notice-content')).toHaveLength(3);
    });

    it('retains the explicit static compatibility API outside App', () => {
        let selected: ReturnType<typeof useAdminFeedback> | undefined;
        const Probe = () => {
            selected = useAdminFeedback();
            return null;
        };
        render(<Probe />);
        expect(selected?.message).toBe(message);
    });
});
