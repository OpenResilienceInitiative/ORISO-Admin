import { StrictMode, useEffect } from 'react';
import type { ReactNode } from 'react';
import { App, ConfigProvider, message, theme } from 'antd';
import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { TransportFeedbackBridge } from './index';
import * as transport from '../../api/transportFeedback';
import { captureTransportFeedback, type TransportFeedback } from '../../api/transportFeedback';
import { adminMessageConfig } from '../../constants/adminMessageConfig';

const Content = ({ label }: { label: string }) => {
    const { token } = theme.useToken();
    return (
        <span>
            {label} {token.colorError}
        </span>
    );
};
const HolderProbe = ({ ready }: { ready: (api: ReturnType<typeof App.useApp>) => void }) => {
    const api = App.useApp();
    useEffect(() => {
        ready(api);
    }, [api, ready]);
    return null;
};
const ThemedOwner = ({
    color,
    children,
    enabled = true,
}: {
    color: string;
    children?: ReactNode;
    enabled?: boolean;
}) => (
    <ConfigProvider theme={{ token: { colorError: color } }}>
        <App component={false} message={adminMessageConfig}>
            {enabled && <TransportFeedbackBridge />}
            {children}
        </App>
    </ConfigProvider>
);

describe('actual App transport owner lifecycle', () => {
    it('uses the actual themed holder and keeps captured requests alive across theme rerenders', async () => {
        const staticError = vi.spyOn(message, 'error');
        try {
            const view = render(<ThemedOwner color="#123456" />);
            const report = captureTransportFeedback();
            view.rerender(<ThemedOwner color="#654321" />);
            act(() => report({ content: <Content label="Rerendered" />, duration: 0 }));
            expect(await screen.findByText('Rerendered #654321')).toBeInTheDocument();
            expect(staticError).not.toHaveBeenCalled();
        } finally {
            staticError.mockRestore();
        }
    });

    it('expires A before B and accepts a fresh A remount without resurrecting late notices', async () => {
        const first = render(<ThemedOwner color="#123456" />);
        const a = captureTransportFeedback();
        act(() => a({ content: <Content label="Owned A" />, duration: 0 }));
        await screen.findByText('Owned A #123456');
        first.unmount();
        expect(screen.queryByText('Owned A #123456')).not.toBeInTheDocument();
        const second = render(<ThemedOwner color="#654321" />);
        act(() => a({ content: 'Late A must disappear', duration: 0 }));
        expect(screen.queryByText('Late A must disappear')).not.toBeInTheDocument();
        act(() => captureTransportFeedback()({ content: <Content label="Owned B" />, duration: 0 }));
        await screen.findByText('Owned B #654321');
        second.unmount();
        render(<ThemedOwner color="#123456" />);
        act(() => captureTransportFeedback()({ content: <Content label="Fresh A" />, duration: 0 }));
        await screen.findByText('Fresh A #123456');
        expect(screen.queryByText('Late A must disappear')).not.toBeInTheDocument();
    });

    it('cleans up transport notices while preserving unrelated App feedback', async () => {
        const disposed = vi.fn();
        const close = vi.fn();
        const original = transport.registerTransportFeedbackOwner;
        const registration = vi.spyOn(transport, 'registerTransportFeedbackOwner').mockImplementation((ownerApi) => {
            const release = original({
                error: (notice) => {
                    const releaseNotice = ownerApi.error(notice);
                    return () => {
                        close();
                        releaseNotice();
                    };
                },
            });
            return () => {
                disposed();
                release();
            };
        });
        try {
            let api: ReturnType<typeof App.useApp> | undefined;
            const ready = (value: ReturnType<typeof App.useApp>) => {
                api = value;
            };
            const view = render(
                <ThemedOwner color="#123456">
                    <HolderProbe ready={ready} />
                </ThemedOwner>,
            );
            act(() => {
                api?.message.info({ content: 'Unrelated feedback', duration: 0 });
                captureTransportFeedback()({ content: 'Transport feedback', duration: 0 });
            });
            await screen.findByText('Transport feedback');
            view.rerender(
                <ThemedOwner color="#123456" enabled={false}>
                    <HolderProbe ready={ready} />
                </ThemedOwner>,
            );
            expect(disposed).toHaveBeenCalledTimes(1);
            await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
            await waitFor(() => expect(screen.queryByText('Transport feedback')).not.toBeInTheDocument());
            expect(screen.getByText('Unrelated feedback')).toBeInTheDocument();
        } finally {
            registration.mockRestore();
        }
    });

    it('keeps the new same-holder keyed notice during StrictMode owner replacement', async () => {
        let generation = 0;
        const Emit = () => {
            useEffect(() => {
                generation += 1;
                captureTransportFeedback()({
                    key: 'session-expired',
                    content: `Strict generation ${generation}`,
                    duration: 0,
                });
            }, []);
            return null;
        };
        render(
            <StrictMode>
                <ThemedOwner color="#123456">
                    <Emit />
                </ThemedOwner>
            </StrictMode>,
        );
        expect(await screen.findByText('Strict generation 2')).toBeInTheDocument();
        expect(screen.queryByText('Strict generation 1')).not.toBeInTheDocument();
    });

    it('handles StrictMode setup-cleanup-setup without retaining the expired first origin', async () => {
        const origins: TransportFeedback[] = [];
        const Capture = () => {
            useEffect(() => {
                origins.push(captureTransportFeedback());
            }, []);
            return null;
        };
        render(
            <StrictMode>
                <ThemedOwner color="#123456">
                    <Capture />
                </ThemedOwner>
            </StrictMode>,
        );
        expect(origins).toHaveLength(2);
        act(() => origins[0]({ content: 'Strict stale origin', duration: 0 }));
        expect(screen.queryByText('Strict stale origin')).not.toBeInTheDocument();
        act(() => origins[1]({ content: 'Strict current origin', duration: 0 }));
        expect(await screen.findByText('Strict current origin')).toBeInTheDocument();
    });
});
