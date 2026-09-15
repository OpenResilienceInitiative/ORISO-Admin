import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Modal } from '../Modal';
import { DPIA_CODE_LOCATIONS, DPIA_EVIDENCE } from './dpiaEvidence';
import type { DpiaEvidenceKey } from './dpiaEvidence';
import styles from './styles.module.scss';

type OpenEvidence = (key: DpiaEvidenceKey, trigger: HTMLButtonElement) => void;
const EvidenceContext = createContext<OpenEvidence | null>(null);

export const EvidenceButton = ({ evidenceKey }: { evidenceKey: DpiaEvidenceKey }) => {
    const open = useContext(EvidenceContext);
    if (!open) throw new Error('EvidenceButton requires DpiaEvidenceProvider');
    return (
        <button
            className={styles.evidenceButton}
            type="button"
            data-evidence-key={evidenceKey}
            aria-label={`Evidenz anzeigen: ${DPIA_EVIDENCE[evidenceKey].title}`}
            aria-haspopup="dialog"
            onClick={(event) => open(evidenceKey, event.currentTarget)}
        >
            <span aria-hidden="true">ⓘ</span>
        </button>
    );
};

interface DpiaEvidenceDialogProps {
    evidenceKey: DpiaEvidenceKey | null;
    onClose: () => void;
    /** Captured by the shell before opening, so the modal's autofocus cannot replace it. */
    trigger: HTMLButtonElement | null;
}

/** Uses the established dialog for keyboard, backdrop dismissal and focus trapping. */
export const DpiaEvidenceDialog = ({ evidenceKey, onClose, trigger }: DpiaEvidenceDialogProps) => {
    if (!evidenceKey) return null;
    const evidence = DPIA_EVIDENCE[evidenceKey];
    const close = () => {
        onClose();
        window.setTimeout(() => trigger?.focus(), 0);
    };

    return (
        <Modal
            title={evidence.title}
            onClose={close}
            width={720}
            className={styles.evidenceDialog}
            wrapperTestId="dpia-evidence-backdrop"
        >
            <dl className={styles.evidenceDetails}>
                <div>
                    <dt>Wer</dt>
                    <dd>{evidence.who}</dd>
                </div>
                <div>
                    <dt>Wann</dt>
                    <dd>{evidence.when}</dd>
                </div>
                <div>
                    <dt>Was</dt>
                    <dd>{evidence.what}</dd>
                </div>
                {evidence.src && (
                    <div>
                        <dt>Fundstelle im Code</dt>
                        <dd>{evidence.src}</dd>
                    </div>
                )}
            </dl>
            <ul className={styles.evidenceLinks} aria-label="Quellen">
                {evidence.links.map((link) => (
                    <li key={link.href}>
                        <a href={link.href} target="_blank" rel="noopener noreferrer">
                            {link.label}
                        </a>
                    </li>
                ))}
            </ul>
            {DPIA_CODE_LOCATIONS[evidenceKey] && (
                <section aria-label="Code-Fundstellen">
                    <h3>Code-Fundstellen</h3>
                    <ul className={styles.evidenceLinks}>
                        {DPIA_CODE_LOCATIONS[evidenceKey]?.map((location) => (
                            <li key={`${location.slug}:${location.path}:${location.from}`}>
                                <strong>{location.label}</strong>
                                <br />
                                <span>{location.slug}</span> · <code>{location.path}</code>
                                <br />
                                <span>
                                    Zeilen {location.from}–{location.to}
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </Modal>
    );
};

/** One dialog controller is shared by the shell and every mounted chapter. */
export const DpiaEvidenceProvider = ({ children }: { children: ReactNode }) => {
    const [key, setKey] = useState<DpiaEvidenceKey | null>(null);
    const trigger = useRef<HTMLButtonElement | null>(null);
    const open = useCallback<OpenEvidence>((nextKey, opener) => {
        trigger.current = opener;
        setKey(nextKey);
    }, []);
    return (
        <EvidenceContext.Provider value={open}>
            {children}
            <DpiaEvidenceDialog evidenceKey={key} trigger={trigger.current} onClose={() => setKey(null)} />
        </EvidenceContext.Provider>
    );
};
