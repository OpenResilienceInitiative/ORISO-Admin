import classNames from 'classnames';
import { Input } from 'antd';
import { useTranslation } from 'react-i18next';
import { Card } from '../../Card';
import { FloatingLabelInput } from '../../FloatingLabelInput';
import { FloatingLabelSelect } from '../../FloatingLabelSelect';
import { M3Button } from '../../M3Button';
import { ReactComponent as ShieldIcon } from '../../../resources/img/svg/verified.svg';
import styles from './styles.module.scss';

/**
 * Stable salutation keys (#994) — persisted as-is, rendered via i18n. Must
 * stay identical to the option list of the normal admin consultant form
 * (`src/pages/users/Edit`), so a wizard-created consultant reads back
 * identically there.
 */
export const SALUTATION_KEYS = [
    'counsellor_female',
    'counsellor_male',
    'counselling_person',
    'counsellor_gender_neutral',
    'not_specified',
] as const;

export interface PersonalInfo {
    firstName: string;
    lastName: string;
    salutation?: string;
    position: string;
    title: string;
    remarks: string;
}

export interface PersonalInfoCardProps {
    value: PersonalInfo;
    onChange: (patch: Partial<PersonalInfo>) => void;
    /**
     * First/last name come from the invite in the public onboarding wizard
     * (#997) and are shown read-only there — corrections go through the admin.
     */
    namesReadOnly?: boolean;
    /**
     * The remarks field is admin-facing (tenant-admin-gated `adminRemarks`,
     * #994). The public wizard hides it — there is no channel for it.
     */
    hideRemarks?: boolean;
    onBack?: () => void;
    onNext?: () => void;
    className?: string;
}

/**
 * Counsellor Setup Wizard — "Information about your person" step (Figma 1-34809).
 * Pure assembly of FloatingLabelInput (text + textarea) + FloatingLabelSelect
 * (salutation) inside the shared Card skeleton. Every field is the same M3
 * outlined control — transparent, floating label — so the form reads as one system.
 */
export const PersonalInfoCard = ({
    value,
    onChange,
    namesReadOnly,
    hideRemarks,
    onBack,
    onNext,
    className,
}: PersonalInfoCardProps) => {
    const { t } = useTranslation();
    return (
        <Card
            className={classNames(styles.card, className)}
            headerIcon={<ShieldIcon />}
            titleKey="cards.personalInfo.title"
            subTitle={t('cards.personalInfo.subtitle')}
            footer={
                onBack || onNext ? (
                    <>
                        {onBack && (
                            <M3Button variant="text" onClick={onBack}>
                                {t('cards.actions.back')}
                            </M3Button>
                        )}
                        {onNext && (
                            <M3Button variant="text" onClick={onNext}>
                                {t('cards.actions.next')}
                            </M3Button>
                        )}
                    </>
                ) : undefined
            }
        >
            <div className={styles.body}>
                <FloatingLabelInput
                    label={t('cards.personalInfo.firstName')}
                    value={value.firstName}
                    readOnly={namesReadOnly}
                    disabled={namesReadOnly}
                    onChange={(e) => onChange({ firstName: e.target.value })}
                />
                <FloatingLabelInput
                    label={t('cards.personalInfo.lastName')}
                    value={value.lastName}
                    readOnly={namesReadOnly}
                    disabled={namesReadOnly}
                    onChange={(e) => onChange({ lastName: e.target.value })}
                />
                <FloatingLabelSelect
                    label={t('cards.personalInfo.salutation')}
                    options={SALUTATION_KEYS.map((key) => ({
                        value: key,
                        label: t(`counselor.salutation.option.${key}`),
                    }))}
                    value={value.salutation}
                    onChange={(salutation) => onChange({ salutation })}
                    showSearch
                />
                <FloatingLabelInput
                    label={t('cards.personalInfo.position')}
                    value={value.position}
                    onChange={(e) => onChange({ position: e.target.value })}
                />
                <FloatingLabelInput
                    label={t('cards.personalInfo.jobTitle')}
                    allowClear
                    value={value.title}
                    onChange={(e) => onChange({ title: e.target.value })}
                />
                {!hideRemarks && (
                    <FloatingLabelInput
                        label={t('cards.personalInfo.remarks')}
                        component={Input.TextArea}
                        supportingText={t('cards.personalInfo.remarksHint')}
                        value={value.remarks}
                        onChange={(e) => onChange({ remarks: e.target.value })}
                    />
                )}
            </div>
        </Card>
    );
};
