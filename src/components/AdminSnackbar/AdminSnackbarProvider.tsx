import { Close } from '@mui/icons-material';
import { Alert, IconButton, Snackbar } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { message as legacyMessage, notification as legacyNotification } from 'antd';
import { type ReactNode, useEffect, useState } from 'react';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import {
    clearVisibleAdminSnackbar,
    type AdminSnackbarNotification,
    subscribeToAdminSnackbar,
} from './adminSnackbar';

const DEFAULT_DURATION_MS = 8_000;

type LegacyNotice = string | { content?: ReactNode; message?: ReactNode; description?: ReactNode; key?: string | number };

const textFromLegacyNotice = (notice: LegacyNotice) => {
    if (typeof notice === 'string') return notice;
    const content = notice.content ?? notice.message ?? notice.description;
    return typeof content === 'string' ? content : String(content ?? '');
};

export const AdminSnackbarProvider = ({ children }: { children: ReactNode }) => {
    const [notification, setNotification] = useState<AdminSnackbarNotification | null>(null);

    useEffect(() => subscribeToAdminSnackbar((event) => {
        if (event.type === 'clear') {
            setNotification((current) => (!event.key || current?.key === event.key ? null : current));
            return;
        }

        // A stable key makes repeated failures replace their visible counterpart
        // instead of building an inaccessible stack of identical alerts.
        setNotification((current) =>
            current?.key && current.key === event.notification.key ? { ...event.notification } : event.notification,
        );
    }), []);

    useEffect(() => {
        // The admin still has many historical antd call sites. Bridging their
        // public notification API means they adopt the new accessible surface
        // immediately while individual screens are converted incrementally.
        const install = (target: typeof legacyMessage | typeof legacyNotification, severity: AdminSnackbarNotification['severity']) => {
            const original = target[severity] as (notice: LegacyNotice) => unknown;
            (target[severity] as unknown as (notice: LegacyNotice) => unknown) = (notice) => {
                setNotification({
                    key: typeof notice === 'object' && notice.key != null ? `legacy-${notice.key}` : undefined,
                    severity,
                    message: textFromLegacyNotice(notice),
                });
                return undefined;
            };
            return () => {
                (target[severity] as unknown as (notice: LegacyNotice) => unknown) = original;
            };
        };

        return ['success', 'info', 'warning', 'error'].map((severity) =>
            install(legacyMessage, severity as AdminSnackbarNotification['severity']),
        ).concat(['success', 'info', 'warning', 'error'].map((severity) =>
            install(legacyNotification, severity as AdminSnackbarNotification['severity']),
        )).reduceRight((cleanup, restore) => () => {
            restore();
            cleanup();
        }, () => {});
    }, []);

    const close = () => {
        notification?.onClose?.();
        clearVisibleAdminSnackbar(notification?.key);
        setNotification(null);
    };

    return (
        <ThemeProvider theme={orisoMuiTheme}>
            {children}
            <Snackbar
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                autoHideDuration={notification?.persistent ? null : DEFAULT_DURATION_MS}
                onClose={(_event, reason) => {
                    if (reason !== 'clickaway') close();
                }}
                open={Boolean(notification)}
                sx={{ top: { xs: 12, sm: 84 } }}
            >
                <Alert
                    action={
                        <IconButton aria-label="Close notification" color="inherit" onClick={close} size="small">
                            <Close fontSize="small" />
                        </IconButton>
                    }
                    onClose={close}
                    role="alert"
                    severity={notification?.severity ?? 'info'}
                    sx={(theme) => notification?.severity === 'error'
                        ? {
                            alignItems: 'center',
                            backgroundColor: 'var(--m3-error, #b1005e)',
                            color: 'var(--m3-on-error, #ffffff)',
                            '& .MuiAlert-icon, & .MuiIconButton-root': { color: 'inherit' },
                            '& .MuiAlert-message': { color: 'inherit' },
                        }
                        : { alignItems: 'center', color: theme.palette.text.primary }}
                >
                    {notification?.message}
                </Alert>
            </Snackbar>
        </ThemeProvider>
    );
};
