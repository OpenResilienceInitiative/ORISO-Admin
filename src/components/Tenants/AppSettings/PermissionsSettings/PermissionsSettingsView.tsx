import { Form, Tooltip } from 'antd';
import { Trans, useTranslation } from 'react-i18next';
import { Card } from '../../../Card';
import { CardDeck } from '../../../CardDeck';
import { CardEditable } from '../../../CardEditable';
import { EditButton } from '../../../EditButton';
import { CHAT_TYPE_CARDS } from './chatTypeCards';
import { AskerPermissionsCard } from './AskerPermissionsCard';
import { CaseHandoverCard } from './CaseHandoverCard';
import { CheckToggle } from './CheckToggle';
import { M3Checkbox } from '../../../M3Checkbox';
import { isSubToggleDisabled } from './permissionsSettingsUtils';
import { runtimeConfig } from '../../../../config/runtimeConfig';
import { ReactComponent as InfoIcon } from '../../../../resources/img/svg/i.svg';
import type {
    ChatTypeCardKey,
    EnforceChangeHandler,
    PermissionToggleCapability,
    ToggleAfterChangeHandler,
} from './types';
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
    /**
     * "Enforce active states" mode (upper roles only). Each feature row gains a checkbox; a
     * checked feature is locked on for every lower role (platform → tenant → agency) and can no
     * longer be hidden by them. Maps to Figma node 105:11334.
     */
    enforceMode?: boolean;
    /** Field keys (settings.<key>) currently enforced-on. */
    enforcedFields?: Set<string>;
    onEnforceChange?: EnforceChangeHandler;
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
    enforceMode = false,
    enforcedFields,
    onEnforceChange,
}: PermissionsSettingsViewProps) => {
    const { t } = useTranslation();
    const cardsToRender = excludeCardKeys?.length
        ? CHAT_TYPE_CARDS.filter((card) => !excludeCardKeys.includes(card.key))
        : CHAT_TYPE_CARDS;
    const enforceHeaderNote = t('tenants.permissions.enforce.headerNote');
    const enforceTooltip = t('tenants.permissions.enforce.tooltip');

    const enforceCheckbox = (fieldKey: string, featureLabel: string) => (
        <Tooltip title={enforceTooltip}>
            <span className={styles.enforceCheckbox}>
                <M3Checkbox
                    label={t('tenants.permissions.enforce.checkboxLabel', { feature: featureLabel })}
                    checked={enforcedFields?.has(fieldKey) ?? false}
                    onChange={(next) => onEnforceChange?.(fieldKey, next)}
                />
            </span>
        </Tooltip>
    );

    return (
        <CardEditable
            key={`permissions-${tenantId}-${formStateKey}`}
            className={styles.transparentCardWrapper}
            isLoading={isLoading}
            initialValues={initialValues}
            titleKey="tenants.permissions.title"
            onSave={onSave}
        >
            {({ editing, startEditing }) => (
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
                                onToggleUpdate={onToggleUpdate}
                                enforceMode={enforceMode}
                                enforcedFields={enforcedFields}
                                onEnforceChange={onEnforceChange}
                            />
                        </CardDeck.Item>
                        <CardDeck.Item className={styles.chatTypeCardSlot}>
                            <CaseHandoverCard />
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
                                                footer={
                                                    !editing ? (
                                                        <EditButton
                                                            className={styles.cardFooterEditButton}
                                                            onClick={startEditing}
                                                        />
                                                    ) : undefined
                                                }
                                            >
                                                <p className={styles.cardDescription}>
                                                    <InfoIcon
                                                        aria-hidden="true"
                                                        className={styles.cardDescriptionInfo}
                                                        focusable="false"
                                                    />
                                                    <Trans
                                                        i18nKey={card.descriptionKey}
                                                        components={{
                                                            strong: <strong />,
                                                            small: <span className={styles.cardDescriptionSecondary} />,
                                                        }}
                                                    />
                                                </p>

                                                {/* ORISO-Admin#798: brief notice above controls (no footer). */}
                                                {enforceMode && (
                                                    <p className={styles.enforceHeaderNote}>{enforceHeaderNote}</p>
                                                )}

                                                <div className={styles.masterRow}>
                                                    {enforceMode &&
                                                        masterField &&
                                                        enforceCheckbox(
                                                            masterField[1],
                                                            t('tenants.permissions.card.activated'),
                                                        )}
                                                    <span className={styles.masterLabel}>
                                                        {t('tenants.permissions.card.activated')}
                                                    </span>
                                                    {masterField ? (
                                                        <CheckToggle
                                                            name={masterField}
                                                            label={t('tenants.permissions.card.activated')}
                                                            disabled={restrictedFields.has(masterField[1])}
                                                            onAfterChange={onToggleUpdate}
                                                        />
                                                    ) : (
                                                        <span className={styles.masterRowPlaceholder} aria-hidden>
                                                            —
                                                        </span>
                                                    )}
                                                </div>

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
                                                                {enforceMode &&
                                                                    enforceCheckbox(
                                                                        toggle.field[1],
                                                                        t(toggle.labelKey),
                                                                    )}
                                                                <span className={styles.toggleLabel}>
                                                                    {t(toggle.labelKey)}
                                                                    {unavailableHintKey && (
                                                                        <span className={styles.toggleUnavailableHint}>
                                                                            {t(unavailableHintKey)}
                                                                        </span>
                                                                    )}
                                                                </span>
                                                                <CheckToggle
                                                                    name={toggle.field}
                                                                    label={t(toggle.labelKey)}
                                                                    disabled={
                                                                        Boolean(unavailableHintKey) ||
                                                                        restrictedFields.has(toggle.field[1]) ||
                                                                        isSubToggleDisabled(
                                                                            card,
                                                                            toggle.field,
                                                                            masterEnabled,
                                                                        )
                                                                    }
                                                                    onAfterChange={onToggleUpdate}
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
