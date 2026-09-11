import classNames from 'classnames';
import { Input } from 'antd';
import { Card } from '../../Card';
import { Typography } from '../../Typography';
import { ToggleRow } from '../../ToggleRow';
import { SegmentedTabs } from '../../SegmentedTabs';
import { FloatingLabelSelect } from '../../FloatingLabelSelect';
import { PillGroup, type PillOption } from '../../PillGroup';
import { FloatingLabelInput } from '../../FloatingLabelInput';
import { M3Button } from '../../M3Button';
import { ReactComponent as FaceIcon } from '../../../resources/img/svg/face_nod.svg';
import { ReactComponent as ClockIcon } from '../../../resources/img/svg/oriso/schedule_24px.svg';
import { ReactComponent as PencilIcon } from '../../../resources/img/svg/pencil.svg';
import styles from './styles.module.scss';

const GearIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden width="18" height="18">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
        <path
            d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
        />
    </svg>
);

const TABS = [
    { key: 'advice', label: 'Advice needed' },
    { key: 'holiday', label: 'Holiday' },
    { key: 'emergency', label: 'Emergency' },
    { key: 'illness', label: 'Illness' },
];

const DURATIONS = [
    { label: '1 hour', value: '1h' },
    { label: '3 hours', value: '3h' },
    { label: '1 day', value: '1d' },
];

const LANGUAGES: PillOption[] = [
    { value: 'de', label: 'German' },
    { value: 'en', label: 'English' },
    { value: 'tr', label: 'Turkish' },
    { value: 'uk', label: 'Ukrainian' },
];

export interface CaseTakeoverValue {
    activated: boolean;
    optOut: boolean;
    activeTab: string;
    consentSeeker: boolean;
    consentAdvisor: boolean;
    sessionDuration: string;
    notificationLang: string;
    notificationText: string;
}

export interface CaseTakeoverCardProps {
    value: CaseTakeoverValue;
    onChange: (patch: Partial<CaseTakeoverValue>) => void;
    onConfig?: () => void;
    onEnforce?: () => void;
    className?: string;
}

/**
 * "Case takeover" permission card (Figma 900-7044) — the richest card in the set.
 * Assembles ToggleRow + AdminSegmentedTabs + FloatingLabelSelect + PillGroup +
 * FloatingLabelInput (textarea) inside the shared Card skeleton. Every control is
 * a shared primitive; the card only lays them out.
 */
export const CaseTakeoverCard = ({ value, onChange, onConfig, onEnforce, className }: CaseTakeoverCardProps) => (
    <Card
        className={classNames(styles.card, className)}
        headerIcon={<FaceIcon />}
        titleKey="Case takeover"
        footer={
            <>
                <M3Button variant="text" icon={<GearIcon />} onClick={onConfig}>
                    Config
                </M3Button>
                <M3Button variant="text" icon={<PencilIcon />} onClick={onEnforce}>
                    Enforce Activated selections
                </M3Button>
            </>
        }
    >
        <div className={styles.body}>
            <ToggleRow
                label="Activated"
                checkbox
                checked={value.activated}
                onCheckedChange={(activated) => onChange({ activated })}
            />
            <Typography variant="body-medium" color="var(--m3-on-surface-variant, #444748)">
                Manage permissions, notifications, and consent rules here.
            </Typography>
            <ToggleRow
                label="Opt-out message to the advice seeker"
                checkbox
                checked={value.optOut}
                onCheckedChange={(optOut) => onChange({ optOut })}
            />

            <SegmentedTabs
                ariaLabel="Case takeover scope"
                tabs={TABS}
                activeKey={value.activeTab}
                onChange={(activeTab) => onChange({ activeTab })}
            />

            <ToggleRow
                label="Consent from advice seeker"
                checked={value.consentSeeker}
                onCheckedChange={(consentSeeker) => onChange({ consentSeeker })}
            />
            <ToggleRow
                label="Consent from advisor"
                checked={value.consentAdvisor}
                onCheckedChange={(consentAdvisor) => onChange({ consentAdvisor })}
            />

            <FloatingLabelSelect
                label="Maximum Session Duration"
                leadingIcon={<ClockIcon />}
                options={DURATIONS}
                value={value.sessionDuration}
                onChange={(sessionDuration) => onChange({ sessionDuration })}
            />

            <PillGroup
                mode="single"
                options={LANGUAGES}
                value={value.notificationLang ? [value.notificationLang] : []}
                onChange={(next) => onChange({ notificationLang: next[0] })}
            />

            <FloatingLabelInput
                label="System notification"
                component={Input.TextArea}
                value={value.notificationText}
                onChange={(e) => onChange({ notificationText: e.target.value })}
            />
        </div>
    </Card>
);
