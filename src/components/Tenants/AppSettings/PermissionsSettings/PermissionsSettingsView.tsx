import { Form } from 'antd';
import { Trans, useTranslation } from 'react-i18next';
import { CardDeck } from '../../../CardDeck';
import { CardEditable } from '../../../CardEditable';
import { EditButton } from '../../../EditButton';
import { CHAT_TYPE_CARDS } from './chatTypeCards';
import { CaseHandoverCard } from './CaseHandoverCard';
import { CheckToggle } from './CheckToggle';
import { isSubToggleDisabled } from './permissionsSettingsUtils';
import type { ChatTypeCardKey, ToggleAfterChangeHandler } from './types';
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
                        footerClassName={styles.permissionsCardDeckFooter}
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
                                        const masterEnabled = card.masterField
                                            ? getFieldValue(card.masterField) !== false
                                            : true;
                                        const CardIcon = card.Icon;
                                        return (
                                            <div className={styles.chatTypeCard}>
                                                <div className={styles.cardHeader}>
                                                    <span className={styles.cardIcon} aria-hidden>
                                                        <CardIcon width={40} height={40} />
                                                    </span>
                                                    <h3 className={styles.cardTitle}>{t(card.titleKey)}</h3>
                                                </div>

                                                <div className={styles.masterRow}>
                                                    <span className={styles.masterLabel}>
                                                        {t('tenants.permissions.card.activated')}
                                                    </span>
                                                    {card.masterField ? (
                                                        <CheckToggle
                                                            name={card.masterField}
                                                            label={t('tenants.permissions.card.activated')}
                                                            disabled={restrictedFields.has(card.masterField[1])}
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

                                                <div className={styles.cardFooterActions}>
                                                    {!editing && (
                                                        <EditButton
                                                            className={styles.cardFooterEditButton}
                                                            onClick={startEditing}
                                                        />
                                                    )}
                                                </div>
                                            </div>
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
