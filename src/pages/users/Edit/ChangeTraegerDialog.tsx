import { Alert } from 'antd';
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined';
import { useTranslation } from 'react-i18next';
import { DialogButton, Modal } from '../../../components/Modal';
import {
    CHANGE_TENANT_ERRORS,
    type ChangeConsultantTenantResult,
    type ChangeTenantErrorCode,
} from '../../../api/counselor/changeConsultantTenant';
import styles from './styles.module.scss';

/** A second try can succeed; for the others the admin has to change something first. */
const RETRYABLE: ChangeTenantErrorCode[] = [
    CHANGE_TENANT_ERRORS.IDENTITY_PROVIDER_UNAVAILABLE,
    CHANGE_TENANT_ERRORS.NETWORK,
    CHANGE_TENANT_ERRORS.UNKNOWN,
];

export interface ChangeTraegerDialogProps {
    consultantName: string;
    fromTraeger: string;
    toTraeger: string;
    /** Labels of the counselling centres the counsellor gets at the new Träger. */
    centres: string[];
    /**
     * Open cases that stay with the old Träger, when known before the call. The server only reports
     * the number with its answer, so the page leaves this out and the dialog speaks in general.
     */
    openCases?: number;
    /** Where the admin can follow case handovers; left out when they may not read that log. */
    handoverLogHref?: string;
    step: 'confirm' | 'saving' | 'done';
    /** Why the last attempt failed. The edit stays as it was. */
    error?: ChangeTenantErrorCode;
    result?: Pick<ChangeConsultantTenantResult, 'casesLeftWithPreviousTenant' | 'matrixAccessRevocationsQueued'>;
    onConfirm: () => void;
    /** Back to the form, nothing saved. */
    onCancel: () => void;
    onDone: () => void;
}

/**
 * Admin#1216: moving a counsellor to another Träger leaves their open cases behind. Says so before
 * the admin confirms, shows what the server answered afterwards, and names the reason when it
 * refused.
 */
export const ChangeTraegerDialog = ({
    consultantName,
    fromTraeger,
    toTraeger,
    centres,
    openCases,
    handoverLogHref,
    step,
    error,
    result,
    onConfirm,
    onCancel,
    onDone,
}: ChangeTraegerDialogProps) => {
    const { t } = useTranslation();
    const values = { name: consultantName, from: fromTraeger, to: toTraeger, centres: centres.join(', ') };
    const saving = step === 'saving';

    const casesSentence = (count?: number, done = false) => {
        if (count === undefined) {
            return t('counselor.changeTenant.cases.unknown', values);
        }
        if (count === 0) {
            return t(done ? 'counselor.changeTenant.cases.noneDone' : 'counselor.changeTenant.cases.none', values);
        }
        return t('counselor.changeTenant.cases.count', { ...values, count });
    };

    if (step === 'done') {
        const left = result?.casesLeftWithPreviousTenant ?? 0;
        const rooms = result?.matrixAccessRevocationsQueued ?? 0;
        return (
            <Modal
                icon={<SwapHorizOutlinedIcon />}
                title={t('counselor.changeTenant.done.title')}
                description={t('counselor.changeTenant.done.description', values)}
                width={560}
                onClose={onDone}
                footer={
                    <div className={styles.dialogActions}>
                        <DialogButton primary onClick={onDone}>
                            {t('counselor.changeTenant.done.close')}
                        </DialogButton>
                    </div>
                }
            >
                <p>{casesSentence(left, true)}</p>
                {left > 0 && <p>{t('counselor.changeTenant.takeover', values)}</p>}
                {rooms > 0 && (
                    <p className={styles.dialogHint}>{t('counselor.changeTenant.done.chats', { count: rooms })}</p>
                )}
            </Modal>
        );
    }

    return (
        <Modal
            icon={<SwapHorizOutlinedIcon />}
            title={t('counselor.changeTenant.title', values)}
            description={t('counselor.changeTenant.description', values)}
            width={600}
            onClose={onCancel}
            // No way out while the request runs: the answer decides what happens next.
            closable={!saving}
            maskClosable={!saving}
            keyboard={!saving}
            footer={
                <div className={styles.dialogActions}>
                    <DialogButton onClick={onCancel} disabled={saving}>
                        {t('counselor.changeTenant.back')}
                    </DialogButton>
                    {(!error || RETRYABLE.includes(error)) && (
                        <DialogButton primary onClick={onConfirm} loading={saving} disabled={saving}>
                            {t(error ? 'counselor.changeTenant.retry' : 'counselor.changeTenant.confirm')}
                        </DialogButton>
                    )}
                </div>
            }
        >
            {error && (
                <Alert
                    className={styles.dialogError}
                    type="error"
                    showIcon
                    message={t(`counselor.changeTenant.error.${error}`)}
                />
            )}
            <div className={styles.dialogNotice}>
                <p>{casesSentence(openCases)}</p>
                <p>{t('counselor.changeTenant.accessLoss', values)}</p>
                <p>{t('counselor.changeTenant.takeover', values)}</p>
            </div>
            <p className={styles.dialogHint}>{t('counselor.changeTenant.voluntary')}</p>
            {handoverLogHref && (
                <p>
                    <a href={handoverLogHref} target="_blank" rel="noopener noreferrer">
                        {t('counselor.changeTenant.handoverLink')}
                    </a>
                </p>
            )}
        </Modal>
    );
};
