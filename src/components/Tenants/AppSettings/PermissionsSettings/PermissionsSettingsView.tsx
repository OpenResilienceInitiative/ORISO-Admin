import { Form } from 'antd';
import { useCallback, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Card } from '../../../Card';
import { CardDeck } from '../../../CardDeck';
import { CardEditable } from '../../../CardEditable';
import { CHAT_TYPE_CARDS } from './chatTypeCards';
import { AskerPermissionsCard } from './AskerPermissionsCard';
import { CaseHandoverCard } from './CaseHandoverCard';
import { PermissionPolicyControl } from '../../../PermissionPolicyControl/PermissionPolicyControl';
import { isSubToggleDisabled } from './permissionsSettingsUtils';
import { runtimeConfig } from '../../../../config/runtimeConfig';
import type { ChatTypeCardKey, PermissionToggleCapability, ToggleAfterChangeHandler } from './types';
import type { PolicyValue } from '../../../../types/permissionPolicy';
import styles from './styles.module.scss';

/**
 * Reason a toggle cannot control anything in this environment, or `null` when
 * it can (ORISO-Admin#734).
 *
 * The AI media check is the only such capability today: it needs a deployed
 * content scanner and a signed zero-retention sub-processor agreement. Until
 * both exist the switch would move without changing any behaviour, which
 * misleads QA and the client — so it is disabled and says why.
 */
const unavailableCapabilityHintKey = (capability: PermissionToggleCapability | undefined): string | null => {
    if (capability === 'mediaAiScan' && !runtimeConfig.mediaAiScanAvailable) {
        return 'tenants.permissions.feature.mediaAiScanUnavailable';
    }
    return null;
};

export type PermissionsSettingsViewProps = {
    tenantId: string;
    excludeCardKeys?: Array<ChatTypeCardKey>;
    isLoading: boolean;
    initialValues: Record<string, unknown>;
    formStateKey: string;
    restrictedFields: Set<string>;
    onToggleUpdate: ToggleAfterChangeHandler;
    onSave: (formData: unknown) => void;
    policyLevel?: 'platform' | 'tenant' | 'agency';
    permissionPolicies?: Record<string, PolicyValue<boolean>>;
    pendingPolicyField?: string | null;
    onPolicyChange?: (fieldKey: string, policy: PolicyValue<boolean>) => void;
};

export const PermissionsSettingsView = ({
    tenantId,
    excludeCardKeys,
    isLoading,
    initialValues,
    formStateKey,
    restrictedFields,
    onToggleUpdate,
    onSave,
    policyLevel = 'tenant',
    permissionPolicies,
    pendingPolicyField,
    onPolicyChange,
}: PermissionsSettingsViewProps) => {
    const { t } = useTranslation();
    const [openPolicyMenu, setOpenPolicyMenu] = useState<string | null>(null);
    const cardsToRender = excludeCardKeys?.length
        ? CHAT_TYPE_CARDS.filter((card) => !excludeCardKeys.includes(card.key))
        : CHAT_TYPE_CARDS;

    const policyFor = useCallback(
        (fieldKey: string, currentValue: unknown): PolicyValue<boolean> =>
            permissionPolicies?.[fieldKey] ?? {
                value: currentValue !== false,
                mode: restrictedFields.has(fieldKey) ? 'ENFORCED' : 'SUGGESTED',
                inherited: restrictedFields.has(fieldKey),
            },
        [permissionPolicies, restrictedFields],
    );

    const changePolicy = useCallback(
        (fieldKey: string, next: PolicyValue<boolean>, currentFormData: unknown) => {
            if (onPolicyChange) {
                onPolicyChange(fieldKey, next);
                return;
            }
            onToggleUpdate(['settings', fieldKey], next.value, currentFormData);
        },
        [onPolicyChange, onToggleUpdate],
    );

    return (
        <CardEditable
            key={`permissions-${tenantId}-${formStateKey}`}
            className={styles.transparentCardWrapper}
            isLoading={isLoading}
            initialValues={initialValues}
            titleKey="tenants.permissions.title"
            onSave={onSave}
            editMode
            hideSaveButton
            hideCancelButton
        >
            {({ form }) => (
                <div className={styles.cardGridOuter}>
                    <CardDeck
                        ariaLabel={t('tenants.permissions.title')}
                        className={styles.permissionsCardDeck}
                        deckClassName={styles.cardGrid}
                        previousLabel={t('permissions.cardDeck.previous')}
                        nextLabel={t('permissions.cardDeck.next')}
                    >
                        {/* ORISO-Admin#602: first card under Berechtigungen. These two
                            settings govern the advice seeker's own account, so they come
                            before the per-chat-type feature cards. */}
                        <CardDeck.Item className={styles.chatTypeCardSlot}>
                            <AskerPermissionsCard
                                restrictedFields={restrictedFields}
                                policyLevel={policyLevel}
                                permissionPolicies={permissionPolicies}
                                pendingPolicyField={pendingPolicyField}
                                openPolicyMenu={openPolicyMenu}
                                onOpenPolicyMenu={setOpenPolicyMenu}
                                onPolicyChange={(fieldKey, next) =>
                                    changePolicy(fieldKey, next, form.getFieldsValue(true))
                                }
                            />
                        </CardDeck.Item>
                        <CardDeck.Item className={styles.chatTypeCardSlot}>
                            <CaseHandoverCard
                                policyLevel={policyLevel}
                                permissionPolicies={permissionPolicies}
                                pendingPolicyField={pendingPolicyField}
                                openPolicyMenu={openPolicyMenu}
                                onOpenPolicyMenu={setOpenPolicyMenu}
                                onFeaturePolicyChange={(fieldKey, next) =>
                                    changePolicy(fieldKey, next, form.getFieldsValue(true))
                                }
                            />
                        </CardDeck.Item>
                        {cardsToRender.map((card) => (
                            <CardDeck.Item key={card.key} className={styles.chatTypeCardSlot}>
                                <Form.Item
                                    noStyle
                                    shouldUpdate={(prev, curr) => {
                                        if (!card.masterField) return false;
                                        const [, masterKey] = card.masterField;
                                        return prev?.settings?.[masterKey] !== curr?.settings?.[masterKey];
                                    }}
                                >
                                    {({ getFieldValue }) => {
                                        const { masterField } = card;
                                        const masterEnabled = masterField ? getFieldValue(masterField) !== false : true;
                                        const CardIcon = card.Icon;
                                        return (
                                            <Card
                                                headerIcon={<CardIcon width={40} height={40} />}
                                                titleKey={card.titleKey}
                                            >
                                                <div className={styles.masterRow}>
                                                    <span className={styles.masterLabel}>
                                                        {t('tenants.permissions.card.activated')}
                                                    </span>
                                                    {masterField ? (
                                                        <PermissionPolicyControl
                                                            featureKey={masterField[1]}
                                                            label={t('tenants.permissions.card.activated')}
                                                            level={policyLevel}
                                                            policy={policyFor(
                                                                masterField[1],
                                                                getFieldValue(masterField),
                                                            )}
                                                            open={openPolicyMenu === masterField[1]}
                                                            pending={pendingPolicyField === masterField[1]}
                                                            onOpenChange={(open) =>
                                                                setOpenPolicyMenu(open ? masterField[1] : null)
                                                            }
                                                            onChange={(next) =>
                                                                changePolicy(
                                                                    masterField[1],
                                                                    next,
                                                                    form.getFieldsValue(true),
                                                                )
                                                            }
                                                        />
                                                    ) : (
                                                        <span className={styles.masterRowPlaceholder} aria-hidden>
                                                            —
                                                        </span>
                                                    )}
                                                </div>

                                                <p className={styles.cardDescription}>
                                                    <Trans
                                                        i18nKey={card.descriptionKey}
                                                        components={{
                                                            strong: <strong />,
                                                            small: <span className={styles.cardDescriptionSecondary} />,
                                                        }}
                                                    />
                                                </p>

                                                <div className={styles.cardDivider} />

                                                <div className={styles.togglesSectionLabel}>
                                                    {t('tenants.permissions.card.configurableFeatures')}
                                                </div>

                                                <div className={styles.togglesList}>
                                                    {card.toggles.map((toggle) => {
                                                        const unavailableHintKey = unavailableCapabilityHintKey(
                                                            toggle.requiresCapability,
                                                        );
                                                        return (
                                                            <div
                                                                key={toggle.field.join('.')}
                                                                className={styles.toggleRow}
                                                            >
                                                                <span className={styles.toggleLabel}>
                                                                    {t(toggle.labelKey)}
                                                                    {unavailableHintKey && (
                                                                        <span className={styles.toggleUnavailableHint}>
                                                                            {t(unavailableHintKey)}
                                                                        </span>
                                                                    )}
                                                                </span>
                                                                <PermissionPolicyControl
                                                                    featureKey={toggle.field[1]}
                                                                    label={t(toggle.labelKey)}
                                                                    level={policyLevel}
                                                                    policy={policyFor(
                                                                        toggle.field[1],
                                                                        getFieldValue(toggle.field),
                                                                    )}
                                                                    open={openPolicyMenu === toggle.field[1]}
                                                                    pending={
                                                                        pendingPolicyField === toggle.field[1] ||
                                                                        Boolean(unavailableHintKey) ||
                                                                        isSubToggleDisabled(
                                                                            card,
                                                                            toggle.field,
                                                                            masterEnabled,
                                                                        )
                                                                    }
                                                                    onOpenChange={(open) =>
                                                                        setOpenPolicyMenu(open ? toggle.field[1] : null)
                                                                    }
                                                                    onChange={(next) =>
                                                                        changePolicy(
                                                                            toggle.field[1],
                                                                            next,
                                                                            form.getFieldsValue(true),
                                                                        )
                                                                    }
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </Card>
                                        );
                                    }}
                                </Form.Item>
                            </CardDeck.Item>
                        ))}
                    </CardDeck>
                </div>
            )}
        </CardEditable>
    );
};
