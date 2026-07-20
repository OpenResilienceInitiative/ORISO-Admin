import classNames from 'classnames';
import { Input } from 'antd';
import { Card } from '../../Card';
import { FloatingLabelInput } from '../../FloatingLabelInput';
import { FloatingLabelSelect } from '../../FloatingLabelSelect';
import { M3Button } from '../../M3Button';
import { ReactComponent as ShieldIcon } from '../../../resources/img/svg/verified.svg';
import styles from './styles.module.scss';

const SALUTATIONS = [
    { label: 'Miss', value: 'miss' },
    { label: 'Mister', value: 'mister' },
    { label: 'Not Specified', value: 'not_specified' },
    { label: 'Non Binary', value: 'non_binary' },
];

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
export const PersonalInfoCard = ({ value, onChange, onBack, onNext, className }: PersonalInfoCardProps) => (
    <Card
        className={classNames(styles.card, className)}
        headerIcon={<ShieldIcon />}
        titleKey="Information about your person"
        subTitle="These data are only visible internally to the advisors and administrators of Caritas"
        footer={
            <>
                <M3Button variant="text" onClick={onBack}>
                    Back
                </M3Button>
                <M3Button variant="text" onClick={onNext}>
                    Next
                </M3Button>
            </>
        }
    >
        <div className={styles.body}>
            <FloatingLabelInput
                label="First name"
                value={value.firstName}
                onChange={(e) => onChange({ firstName: e.target.value })}
            />
            <FloatingLabelInput
                label="Last name"
                value={value.lastName}
                onChange={(e) => onChange({ lastName: e.target.value })}
            />
            <FloatingLabelSelect
                label="Salutation"
                options={SALUTATIONS}
                value={value.salutation}
                onChange={(salutation) => onChange({ salutation })}
                showSearch
            />
            <FloatingLabelInput
                label="Position"
                value={value.position}
                onChange={(e) => onChange({ position: e.target.value })}
            />
            <FloatingLabelInput
                label="Title"
                allowClear
                value={value.title}
                onChange={(e) => onChange({ title: e.target.value })}
            />
            <FloatingLabelInput
                label="Other remarks"
                component={Input.TextArea}
                supportingText="Visible only to sponsors and admins"
                value={value.remarks}
                onChange={(e) => onChange({ remarks: e.target.value })}
            />
        </div>
    </Card>
);
