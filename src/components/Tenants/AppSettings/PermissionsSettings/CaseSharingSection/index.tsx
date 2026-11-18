import BlockIcon from '@mui/icons-material/Block';
import CheckIcon from '@mui/icons-material/Check';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import LockIcon from '@mui/icons-material/Lock';
import LockPersonOutlinedIcon from '@mui/icons-material/LockPersonOutlined';
import classNames from 'classnames';
import { useId, type ComponentType, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as CaseHandoverIcon } from '../../../../../resources/img/svg/permissions/case_handover.svg';
import { ReactComponent as LockOpenRightFilledIcon } from '../../../../../resources/img/svg/oriso/lock_open_right_filled_20px.svg';
import type { PolicyValue } from '../../../../../types/permissionPolicy';
import controlStyles from '../../../../PermissionPolicyControl/styles.module.scss';
import cardStyles from '../PolicyOptionCard/styles.module.scss';
import { TileSections } from '../../../../TileSections';
import { SectionHelp } from '../SectionHelp';
import { CASE_HANDOVER_HELP, featurePage } from '../tileHelpTopics';
import type { CaseSharingMode } from './caseSharingMode';
import styles from './styles.module.scss';

const K = 'tenants.permissions.caseSharing';

type Option = {
    mode: CaseSharingMode;
    labelKey: string;
    descriptionKey: string;
    Icon: ComponentType<{ className?: string; width?: number; height?: number }>;
};

// #1417: the team option reads the one shared team-function name, so the wording cannot drift.
const OPTIONS: Option[] = [
    {
        mode: 'caseHandover',
        labelKey: `${K}.option.caseHandover.label`,
        descriptionKey: `${K}.option.caseHandover.description`,
        Icon: CaseHandoverIcon,
    },
    {
        mode: 'teamCounselling',
        labelKey: 'teamFunctions.counselling.name',
        descriptionKey: 'teamFunctions.counselling.description',
        Icon: GroupsOutlinedIcon,
    },
    {
        mode: 'none',
        labelKey: `${K}.option.none.label`,
        descriptionKey: `${K}.option.none.description`,
        Icon: LockPersonOutlinedIcon,
    },
];

export type CaseSharingSectionProps = {
    /** The choice and whether it is a requirement for the levels below; undefined while loading. */
    policy: PolicyValue<CaseSharingMode> | undefined;
    level: 'platform' | 'tenant' | 'agency';
    onChange?: (policy: PolicyValue<CaseSharingMode>) => void;
    /** Set: the choice is locked for another reason; this sentence says why. */
    disabledReason?: string;
    /** Today's data has team counselling and case handover on at once. */
    bothActive?: boolean;
    /** Reasons, consent and notification texts; open below the choice when case handover is chosen. */
    handoverSettings?: ReactNode;
};

/**
 * ORISO-Admin#1558: case handover, team counselling or neither, as one choice on the Mailberatung
 * tile. It cascades like every other setting (Frank, 2026-11-18): platform and Träger can make
 * their choice a requirement, and a centre then sees the other options greyed out.
 */
export const CaseSharingSection = ({
    policy,
    level,
    onChange,
    disabledReason,
    bothActive = false,
    handoverSettings,
}: CaseSharingSectionProps) => {
    const { t } = useTranslation();
    // useId gives colons, which an id selector cannot hold; the section only needs uniqueness.
    const sectionId = useId().replace(/:/g, '');
    const enforced = policy?.mode === 'ENFORCED';
    // A requirement from above: nothing to choose here.
    const lockedFromAbove = level !== 'platform' && enforced && policy?.inherited === true;
    const locked = lockedFromAbove || Boolean(disabledReason);
    // A Beratungsstelle has no level below it, so it never sets a requirement.
    const canSetRule = Boolean(policy) && level !== 'agency' && !locked;
    const modeText = t(enforced ? 'tenants.permissions.policy.enforced' : 'tenants.permissions.policy.suggestion');
    const modeAction = t(
        enforced ? 'tenants.permissions.policy.makeAdjustable' : 'tenants.permissions.policy.makeRequired',
    );
    const lock = (
        <>
            {enforced ? <LockIcon /> : <LockOpenRightFilledIcon aria-hidden data-icon="lock-open-right-filled" />}
            {modeText}
        </>
    );

    return (
        <TileSections.Section
            wide
            id={`case-sharing-${sectionId}`}
            title={t(`${K}.title`)}
            note={t(`${K}.description`)}
            titleAction={<SectionHelp topic={CASE_HANDOVER_HELP} />}
            learnMoreHref={featurePage('caseHandover')}
            collapsible
        >
            {bothActive && (
                <p className={styles.warning} role="status">
                    {t(`${K}.bothActive`)}
                </p>
            )}
            <div role="group" aria-label={t(`${K}.optionsLabel`)} className={styles.options}>
                {OPTIONS.map(({ mode, labelKey, descriptionKey, Icon }) => {
                    const chosen = policy?.value === mode;
                    const label = t(labelKey);
                    const state = t(chosen ? `${K}.chosen` : `${K}.notChosen`);
                    return (
                        <div
                            key={mode}
                            className={classNames(cardStyles.card, styles.option, {
                                [styles.chosen]: chosen,
                                [styles.greyed]: locked && !chosen,
                            })}
                            data-case-sharing-option={mode}
                        >
                            <span className={cardStyles.icon} aria-hidden>
                                <Icon className={cardStyles.glyph} width={20} height={20} />
                            </span>
                            <div className={classNames(controlStyles.control, controlStyles.compact)}>
                                <div className={controlStyles.copy}>
                                    <span className={controlStyles.label}>{label}</span>
                                    {chosen &&
                                        (canSetRule ? (
                                            <button
                                                type="button"
                                                className={classNames(controlStyles.meta, controlStyles.modeButton)}
                                                aria-pressed={enforced}
                                                aria-label={`${t(`${K}.title`)}: ${modeText} – ${modeAction}`}
                                                title={modeAction}
                                                onClick={() =>
                                                    policy &&
                                                    onChange?.({
                                                        value: policy.value,
                                                        mode: enforced ? 'SUGGESTED' : 'ENFORCED',
                                                    })
                                                }
                                            >
                                                {lock}
                                            </button>
                                        ) : (
                                            <span className={controlStyles.meta}>{lock}</span>
                                        ))}
                                    <span className={controlStyles.supportingText}>
                                        {locked && !chosen ? t(`${K}.lockedFromAbove`) : t(descriptionKey)}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    className={classNames(
                                        controlStyles.switchButton,
                                        chosen ? controlStyles.active : controlStyles.inactive,
                                    )}
                                    aria-pressed={chosen}
                                    aria-label={`${label}: ${state}`}
                                    disabled={locked || !policy}
                                    onClick={() =>
                                        !chosen &&
                                        onChange?.({
                                            value: mode,
                                            mode: level === 'agency' ? 'SUGGESTED' : policy?.mode ?? 'SUGGESTED',
                                        })
                                    }
                                >
                                    {chosen ? <CheckIcon /> : <BlockIcon />}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
            {disabledReason && <p className={styles.note}>{disabledReason}</p>}
            {policy?.value === 'caseHandover' && handoverSettings && (
                <div role="group" aria-label={t(`${K}.handoverSettings`)} className={styles.handoverSettings}>
                    {handoverSettings}
                </div>
            )}
        </TileSections.Section>
    );
};
