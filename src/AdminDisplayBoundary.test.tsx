import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App as AntdApp, ConfigProvider, theme } from 'antd';
import { describe, expect, it } from 'vite-plus/test';
import { AdminDisplayBoundary } from './AdminApp';

const OUTER_PRIMARY = '#00ff00';

const TokenProbe = ({ label }: { label: string }) => {
    const { token } = theme.useToken();
    return <span data-testid={label}>{token.colorPrimary}</span>;
};

const OpenConfirm = () => {
    const { modal } = AntdApp.useApp();
    return (
        <>
            <TokenProbe label="page" />
            <button type="button" onClick={() => modal.confirm({ content: <TokenProbe label="dialog" /> })}>
                open confirm
            </button>
        </>
    );
};

describe('AdminDisplayBoundary', () => {
    it('renders App.useApp() confirm dialogs inside the personal theme', async () => {
        render(
            <ConfigProvider theme={{ token: { colorPrimary: OUTER_PRIMARY } }}>
                <AntdApp component={false}>
                    <AdminDisplayBoundary isReady>
                        <OpenConfirm />
                    </AdminDisplayBoundary>
                </AntdApp>
            </ConfigProvider>,
        );

        const page = screen.getByTestId('page').textContent;
        expect(page).not.toBe(OUTER_PRIMARY);

        await userEvent.click(screen.getByRole('button', { name: 'open confirm' }));

        await waitFor(() => expect(screen.getByTestId('dialog').textContent).toBe(page));
    });
});
