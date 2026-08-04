import { Form } from 'antd';
import { Trans, useTranslation } from 'react-i18next';
import { Card } from '../../../Card';
import { CardDeck } from '../../../CardDeck';
import { CardEditable } from '../../../CardEditable';
import { EditButton } from '../../../EditButton';
import { CHAT_TYPE_CARDS } from './chatTypeCards';
import { CaseHandoverCard } from './CaseHandoverCard';
import { CheckToggle } from './CheckToggle';
import { M3Checkbox } from '../../../M3Checkbox';
import { isSubToggleDisabled } from './permissionsSettingsUtils';
import type { ChatTypeCardKey, EnforceChangeHandler, ToggleAfterChangeHandler } from './types';
import styles from './styles.module.scss';

export type PermissionsSettingsViewProps = {
    tenantId: string;
    disableSubTogglesWhenMasterOff: boolean;
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
    disableSubTogglesWhenMasterOff,
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
                                                <div className={styles.masterRow}>
                                                    {enforceMode && masterField && (
                                                        <M3Checkbox
                                                            className={styles.enforceCheckbox}
                                                            label={t('tenants.permissions.enforce.checkboxLabel', {
                                                                feature: t('tenants.permissions.card.activated'),
                                                            })}
                                                            checked={enforcedFields?.has(masterField[1]) ?? false}
                                                            onChange={(next) => onEnforceChange?.(masterField[1], next)}
                                                        />
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
                                                    {card.toggles.map((toggle) => (
                                                        <div key={toggle.field.join('.')} className={styles.toggleRow}>
                                                            {enforceMode && (
                                                                <M3Checkbox
                                                                    className={styles.enforceCheckbox}
                                                                    label={t(
                                                                        'tenants.permissions.enforce.checkboxLabel',
                                                                        {
                                                                            feature: t(toggle.labelKey),
                                                                        },
                                                                    )}
                                                                    checked={
                                                                        enforcedFields?.has(toggle.field[1]) ?? false
                                                                    }
                                                                    onChange={(next) =>
                                                                        onEnforceChange?.(toggle.field[1], next)
                                                                    }
                                                                />
                                                            )}
                                                            <span className={styles.toggleLabel}>
                                                                {t(toggle.labelKey)}
                                                            </span>
                                                            <CheckToggle
                                                                name={toggle.field}
                                                                label={t(toggle.labelKey)}
                                                                disabled={
                                                                    restrictedFields.has(toggle.field[1]) ||
                                                                    (disableSubTogglesWhenMasterOff &&
                                                                        isSubToggleDisabled(
                                                                            card,
                                                                            toggle.field,
                                                                            masterEnabled,
                                                                        ))
                                                                }
                                                                onAfterChange={onToggleUpdate}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>

                                                {enforceMode && (
                                                    <p className={styles.enforceFooterNote}>
                                                        {t('tenants.permissions.enforce.footerNote')}
                                                    </p>
                                                )}
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
