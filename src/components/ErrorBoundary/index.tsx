import { Component, ErrorInfo, ReactNode } from 'react';
import i18next from 'i18next';
import routePathNames from '../../appConfig';

interface ErrorBoundaryProps {
    children: ReactNode;
    /**
     * When any value in this array changes (e.g. the current route), a shown
     * error state is reset so users can navigate away from a crashed page.
     */
    resetKeys?: unknown[];
    /** Distinguishes boundaries in logs, e.g. 'app' vs 'page'. */
    scope?: string;
}

interface ErrorBoundaryState {
    error: Error | null;
}

const arraysDiffer = (a: unknown[] = [], b: unknown[] = []) =>
    a.length !== b.length || a.some((item, index) => !Object.is(item, b[index]));

/**
 * Last line of defense against render-time crashes. Without it a single throw
 * anywhere in the tree unmounts the entire admin into a blank screen; with it
 * the user gets a localized message plus reload / back-to-login actions.
 *
 * The fallback deliberately avoids antd, layout wrappers, and hooks so it
 * cannot depend on anything that may itself have crashed.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { error };
    }

    componentDidUpdate(prevProps: ErrorBoundaryProps) {
        const { resetKeys } = this.props;
        const { error } = this.state;
        if (error && arraysDiffer(prevProps.resetKeys, resetKeys)) {
            this.setState({ error: null });
        }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        const { scope = 'app' } = this.props;
        // eslint-disable-next-line no-console
        console.error(`[ErrorBoundary:${scope}]`, error, errorInfo.componentStack);
    }

    render() {
        const { children } = this.props;
        const { error } = this.state;

        if (!error) {
            return children;
        }

        return (
            <div role="alert" style={{ maxWidth: '480px', margin: '15vh auto 0', padding: '0 24px' }}>
                <h1 style={{ fontSize: '22px', marginBottom: '8px' }}>{i18next.t('errorBoundary.title') as string}</h1>
                <p style={{ marginBottom: '24px' }}>{i18next.t('errorBoundary.description') as string}</p>
                <button
                    type="button"
                    onClick={() => window.location.reload()}
                    style={{ marginRight: '12px', padding: '8px 16px', cursor: 'pointer' }}
                >
                    {i18next.t('errorBoundary.reload') as string}
                </button>
                <a href={routePathNames.login}>{i18next.t('errorBoundary.toLogin') as string}</a>
            </div>
        );
    }
}
