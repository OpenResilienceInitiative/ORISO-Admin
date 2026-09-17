import LockOpenRounded from '@mui/icons-material/LockOpenRounded';
import Logout from '@mui/icons-material/Logout';
import TaskAltRounded from '@mui/icons-material/TaskAltRounded';
import { useTranslation } from 'react-i18next';
import { Modal } from '../Modal';
import { M3Button } from '../M3Button';
import styles from './pendingSignatureDialog.module.scss';

export interface DpaUnlockDialogProps {
    /**
     * "Plattform freischalten". The gate re-asks the backend for the signature
     * state IN THIS HANDLER and only opens the app when the answer is VALID —
     * the button is the second safety check, not a confirmation of client
     * state (JOB8/JOB9).
     */
    onUnlock: () => void;
    /** Optional second exit; the admin area already renders behind the dialog (#990). */
    onLogout?: () => void;
    /** The re-check is in flight. */
    checking?: boolean;
}

/**
 * Success dialog shown when the forwarded signature lands while the tenant
 * admin is logged in and waiting (JOB8). It closes on an explicit click, and
 * that click verifies the signature against the backend first (JOB9). Until it
 * answers VALID the tenant stays in the forwarded-pending state.
 *
 * Read-only by construction — the gate only ever GETs the DPA status. Nothing
 * here creates or confirms a signature record (ADR-022).
 */
export const DpaUnlockDialog = ({ onUnlock, onLogout, checking = false }: DpaUnlockDialogProps) => {
    const { t } = useTranslation();

    return (
        <Modal
            titleKey="dpaUnlock.title"
            descriptionKey="dpaUnlock.description"
            icon={<TaskAltRounded fontSize="inherit" />}
            closable={false}
            maskClosable={false}
            keyboard={false}
            width={560}
            footer={
                <div className={styles.actions}>
                    {onLogout && (
                        <M3Button variant="text" icon={<Logout fontSize="small" />} onClick={onLogout}>
                            {t('dpaBlocker.logout')}
                        </M3Button>
                    )}
                    <M3Button
                        variant="filled"
                        icon={<LockOpenRounded fontSize="small" />}
                        loading={checking}
                        onClick={onUnlock}
                    >
                        {t('dpaUnlock.action')}
                    </M3Button>
                </div>
            }
        >
            <div className={styles.body} data-testid="dpa-unlock-dialog">
                <p className={styles.note}>{t('dpaUnlock.verifyNote')}</p>
                {checking && (
                    <p className={styles.note} role="status">
                        {t('dpaUnlock.checking')}
                    </p>
                )}
            </div>
        </Modal>
    );
};
