import { useState, type ReactElement, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../../../Modal';
import type { PolicyValue } from '../../../../../types/permissionPolicy';
import { OPTION_ICONS } from '../optionIcons';
import { PolicyOptionCard } from '../PolicyOptionCard';
import type { EffectivePolicy } from '../permissionsSettingsUtils';
import type { PermissionToggleCapability } from '../types';
import permissionStyles from '../styles.module.scss';
import optionCardStyles from '../PolicyOptionCard/styles.module.scss';
import styles from './styles.module.scss';

/** One feature of a side chat (supervision chat, Team-Chat): its label and the setting that stores it. */
export type ChatFeature = {
    labelKey: string;
    field: string;
    requiresCapability?: PermissionToggleCapability;
    appOnly?: boolean;
    /**
     * `false`: TenantService has no such setting yet. The dialog names the feature but offers no switch,
     * so nothing is shown as saved that the server would drop.
     */
    stored?: boolean;
    /** Own supporting text instead of `tenants.permissions.featureDescription.<last part of labelKey>`. */
    descriptionKey?: string;
    /** Interpolation values for label and supporting text, e.g. the shared name of a team function. */
    textOptions?: Record<string, string>;
};

type ChatFeaturesDialogProps = {
    titleKey: string;
    /** Interpolation values for title and description, e.g. the shared name of a team function. */
    textOptions?: Record<string, string>;
    descriptionKey: string;
    saveKey: string;
    cancelKey: string;
    icon: ReactElement;
    testId: string;
    features: readonly ChatFeature[];
    level: 'platform' | 'tenant' | 'agency';
    policyOf: (field: string) => EffectivePolicy;
    pending: (field: string) => boolean;
    /** Why a stored feature cannot be switched here; it is then shown off and locked. */
    unavailableReason?: (feature: ChatFeature) => string | null;
    /** Hints below the features. */
    notes?: ReactNode;
    /**
     * Per field: asked before a draft switches that feature on (a data-protection question). Only `proceed`
     * changes the draft, so cancelling leaves it off; switching off never asks.
     */
    confirmEnable?: Partial<Record<string, (proceed: () => void) => void>>;
    /** Only the features changed in the dialog, once, on "Speichern". */
    onSave: (changes: Record<string, PolicyValue<boolean>>) => void;
    onClose: () => void;
};

const LOCKED_OFF: EffectivePolicy = { value: false, mode: 'ENFORCED', inherited: true };

const descriptionKeyOf = (feature: ChatFeature) =>
    feature.descriptionKey ?? `tenants.permissions.featureDescription.${feature.labelKey.split('.').at(-1)}`;

/**
 * A feature the server cannot store yet: named, marked as prepared, but without a switch. Why is said once
 * for the whole dialog (`notes`), not on every card; the full sentence stays for assistive technology.
 */
const PlannedFeatureCard = ({ feature }: { feature: ChatFeature }) => {
    const { t } = useTranslation();
    const Icon = OPTION_ICONS[feature.labelKey];
    return (
        <div className={optionCardStyles.card} data-planned-feature={feature.field}>
            {Icon && (
                <span className={optionCardStyles.icon} aria-hidden>
                    <Icon className={optionCardStyles.glyph} />
                </span>
            )}
            <div className={styles.plannedCopy}>
                <span className={styles.plannedLabel}>{t(feature.labelKey)}</span>
            </div>
            <span className={styles.plannedChip} title={t('tenants.permissions.feature.notStoredYet')}>
                {t('tenants.permissions.feature.planned')}
                <span className={styles.visuallyHidden}>: {t('tenants.permissions.feature.notStoredYet')}</span>
            </span>
        </div>
    );
};

/**
 * What a side chat offers, as a dialog (ORISO-Admin#1577 supervision; Frank, 2026-11-20 Team-Chat). Each
 * feature keeps its own "Anpassbar"/"Vorgabe"; changes stay drafts until "Speichern", and only the changed
 * ones are handed on, together.
 */
export const ChatFeaturesDialog = ({
    titleKey,
    textOptions,
    descriptionKey,
    saveKey,
    cancelKey,
    icon,
    testId,
    features,
    level,
    policyOf,
    pending,
    unavailableReason = () => null,
    notes,
    confirmEnable = {},
    onSave,
    onClose,
}: ChatFeaturesDialogProps) => {
    const { t } = useTranslation();
    const [drafts, setDrafts] = useState<Record<string, PolicyValue<boolean>>>({});
    const switchable = (feature: ChatFeature) => feature.stored !== false && !unavailableReason(feature);
    // A requirement inherited from above (also one that arrives while the dialog is open) wins over a draft.
    const lockedFromAbove = (field: string) => {
        const current = policyOf(field);
        return current.inherited === true && current.mode === 'ENFORCED';
    };
    const policyFor = (feature: ChatFeature) => {
        if (unavailableReason(feature)) return LOCKED_OFF;
        if (lockedFromAbove(feature.field)) return policyOf(feature.field);
        return drafts[feature.field] ?? policyOf(feature.field);
    };

    const save = () => {
        const changed = Object.fromEntries(
            features
                .filter((feature) => switchable(feature) && drafts[feature.field] && !lockedFromAbove(feature.field))
                .map((feature) => [feature.field, drafts[feature.field]] as const)
                .filter(([field, next]) => {
                    const current = policyOf(field);
                    return current.value !== next.value || current.mode !== next.mode;
                }),
        );
        if (Object.keys(changed).length) onSave(changed);
        onClose();
    };

    return (
        <Modal
            title={t(titleKey, textOptions)}
            description={t(descriptionKey, textOptions)}
            icon={icon}
            okLabelKey={saveKey}
            cancelLabelKey={cancelKey}
            onConfirm={save}
            onClose={onClose}
            width={880}
            scrollableBody
            descriptionFullWidth
            wrapperTestId={testId}
        >
            <div className={permissionStyles.togglesList}>
                {features.map((feature) => {
                    if (feature.stored === false) {
                        return <PlannedFeatureCard key={feature.field} feature={feature} />;
                    }
                    const reason = unavailableReason(feature);
                    return (
                        <PolicyOptionCard
                            key={feature.field}
                            Icon={OPTION_ICONS[feature.labelKey]}
                            featureKey={feature.field}
                            label={t(feature.labelKey, feature.textOptions)}
                            level={level}
                            policy={policyFor(feature)}
                            pending={pending(feature.field)}
                            disabled={Boolean(reason)}
                            supportingText={reason ?? t(descriptionKeyOf(feature), feature.textOptions)}
                            onChange={(next) => {
                                const apply = () =>
                                    setDrafts((current) => ({
                                        ...current,
                                        [feature.field]: { ...next, inherited: false },
                                    }));
                                const ask = confirmEnable[feature.field];
                                if (ask && next.value && !policyFor(feature).value) ask(apply);
                                else apply();
                            }}
                        />
                    );
                })}
            </div>
            {notes}
        </Modal>
    );
};
