import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { inspectAppliedTokens, type InspectionContext, type InspectionReport } from './appliedTokenInspection';

/** Observe only the supplied specimen lifetime; no computed styles are simulated. */
export const observeTokenReference = (target: HTMLElement, schedule: () => void) => {
    if (target.matches('[data-applied-token-inspector]') || target.querySelector('[data-applied-token-inspector]'))
        throw new Error('Token specimen root must exclude inspector output');
    const document = target.ownerDocument;
    const attributes = new MutationObserver(schedule);
    attributes.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class', 'lang'] });
    attributes.observe(target, {
        attributes: true,
        subtree: true,
        attributeFilter: ['style', 'class', 'disabled'],
    });
    const styles = new MutationObserver(schedule);
    styles.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => {
        attributes.disconnect();
        styles.disconnect();
    };
};

export const AppliedTokenInspection = ({
    root,
    context,
    reference,
}: {
    root: HTMLDivElement | null;
    context: InspectionContext;
    reference: 'field' | 'bridge';
}) => {
    const { t } = useTranslation();
    const [report, setReport] = React.useState<InspectionReport | null>(null);
    React.useLayoutEffect(() => {
        const target = root;
        if (!target) return undefined;
        const document = target.ownerDocument;
        const window = document.defaultView;
        if (!window) throw new Error('Token inspection requires a browser window');
        let frame: number | null = null;
        let active = true;
        const read = () => {
            frame = null;
            if (!active || !target.isConnected) return;
            const next = inspectAppliedTokens({ root: target, context, reference });
            setReport((previous) => (JSON.stringify(previous) === JSON.stringify(next) ? previous : next));
        };
        const schedule = () => {
            if (frame === null && active) frame = window.requestAnimationFrame(read);
        };
        const releaseObservations = observeTokenReference(target, schedule);
        const sizes = new ResizeObserver(schedule);
        sizes.observe(target);
        window.addEventListener('resize', schedule);
        document.fonts.addEventListener('loadingdone', schedule);
        read();
        return () => {
            active = false;
            if (frame !== null) window.cancelAnimationFrame(frame);
            releaseObservations();
            sizes.disconnect();
            window.removeEventListener('resize', schedule);
            document.fonts.removeEventListener('loadingdone', schedule);
        };
    }, [root, context, reference]);
    return (
        <section
            data-applied-token-inspector
            style={{ minWidth: 0, maxWidth: '100%', color: 'var(--m3-on-surface)', fontSize: 14 }}
        >
            <h3>{t('tokenInspection.title')}</h3>
            <p>{t('tokenInspection.explanation')}</p>
            <p>{t('tokenInspection.sourceNote')}</p>
            <div
                role="region"
                aria-label={t('tokenInspection.tableRegion')}
                // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- This labelled overflow region needs tab focus for keyboard horizontal scrolling; real axe remains strict.
                tabIndex={0}
                style={{ overflowX: 'auto', maxWidth: '100%' }}
            >
                <table
                    aria-label="Applied design tokens"
                    style={{ width: '100%', minWidth: 720, borderCollapse: 'collapse', textAlign: 'left' }}
                >
                    <thead>
                        <tr>
                            {[
                                'Token',
                                'Meaning',
                                'Source',
                                'Expected',
                                'Calculated',
                                'Applied',
                                'Status',
                                'Contrast',
                            ].map((label) => (
                                <th key={label} scope="col" style={{ padding: 8, verticalAlign: 'top' }}>
                                    {label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {report?.observations.map((observation) => (
                            <tr key={observation.id} data-token-status={observation.status}>
                                <th scope="row" style={{ padding: 8, overflowWrap: 'anywhere' }}>
                                    {observation.name}
                                </th>
                                <td style={{ padding: 8 }}>{observation.meaning}</td>
                                <td style={{ padding: 8, overflowWrap: 'anywhere' }}>{observation.source}</td>
                                <td style={{ padding: 8 }}>{observation.expected}</td>
                                <td style={{ padding: 8 }}>{observation.calculated ?? '—'}</td>
                                <td style={{ padding: 8 }}>{observation.actual ?? '(absent)'}</td>
                                <td style={{ padding: 8 }}>
                                    <strong>{observation.status}</strong>
                                    {observation.issues.map((issue) => (
                                        <div key={issue}>{issue}</div>
                                    ))}
                                </td>
                                <td style={{ padding: 8 }}>
                                    {observation.contrast
                                        ? `${observation.contrast.status}: ${
                                              observation.contrast.ratio === null
                                                  ? '—'
                                                  : `${observation.contrast.ratio.toFixed(2)}:1`
                                          }`
                                        : '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <details open>
                <summary>{t('tokenInspection.machineReport')}</summary>
                <pre
                    aria-label="Applied token report"
                    style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxWidth: '100%' }}
                >
                    {report ? JSON.stringify(report, null, 2) : t('tokenInspection.pending')}
                </pre>
            </details>
        </section>
    );
};
