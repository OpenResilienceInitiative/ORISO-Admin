import type { ReactNode } from 'react';
import type { DefaultOptionType } from 'antd/es/select';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
import ForwardToInboxOutlinedIcon from '@mui/icons-material/ForwardToInboxOutlined';
import type { MenuProps } from 'antd';
import { CollapsibleField } from '../../components/CollapsibleField';
import { FloatingLabelInput } from '../../components/FloatingLabelInput';
import { FloatingLabelSelect } from '../../components/FloatingLabelSelect';
import { IdAllocationField, type IdUnitOption } from '../../components/IdAllocationField';
import { M3Button } from '../../components/M3Button';
import { SplitButton } from '../../components/GlobalSearch/SplitButton';
import { ReactComponent as MailIcon } from '../../resources/img/svg/oriso/mail_24px.svg';
import { ReactComponent as MailFilledIcon } from '../../resources/img/svg/oriso/mail_filled_24px.svg';
import { ReactComponent as FileSaveIcon } from '../../resources/img/svg/oriso/file_save_24px.svg';
import {
    ALSO_COUNSELLOR_LABEL_KEYS,
    ROLE_LABEL_KEYS,
    TOPIC_PERMISSION_LABEL_KEYS,
    TOPIC_PERMISSIONS,
    type InviteRole,
    type InviteSendMode,
    type TopicPermission,
} from './inviteModel';
import type { CollapsibleKey, InviteClients, InviteDraftState } from './useInviteDraft';
import styles from './inviteComposer.module.scss';

/** Select option with a one-line explanation under its title. */
const renderOptionWithHint = (option: { label?: ReactNode; data: DefaultOptionType }): ReactNode => {
    const description = typeof option.data.description === 'string' ? option.data.description : undefined;
    return description ? (
        <span className={styles.optionWithHint}>
            <span className={styles.optionTitle}>{option.label}</span>
            <span className={styles.optionHint}>{description}</span>
        </span>
    ) : (
        option.label
    );
};

interface SelectFieldProps<V extends string> {
    draft: InviteDraftState;
    fieldKey: CollapsibleKey;
    label: string;
    value: V;
    valueLabel: string;
    options: Array<{ value: V; label: string; description?: string }>;
    disabled?: boolean;
    className?: string;
    onChange: (next: V) => void;
}

// Expanding a select's pill opens its menu right away: that is all a select expands for.
const SelectField = <V extends string>({
    draft,
    fieldKey,
    label,
    value,
    valueLabel,
    options,
    disabled = false,
    className,
    onChange,
}: SelectFieldProps<V>) => (
    <span className={styles.placeholderSlot}>
        <CollapsibleField
            collapsed={draft.isCollapsed(fieldKey)}
            disabled={disabled}
            fieldKey={fieldKey}
            label={label}
            pillText={valueLabel}
            valueSummary={valueLabel}
            onExpand={() => {
                draft.expand(fieldKey);
                draft.setOpenSelect(fieldKey);
            }}
        >
            <FloatingLabelSelect<V>
                className={className}
                disabled={disabled}
                label={label}
                open={draft.openSelect === fieldKey}
                optionRender={renderOptionWithHint}
                options={options}
                popupMatchSelectWidth={false}
                value={value}
                onChange={(next) => {
                    onChange(next);
                    draft.setOpenSelect(null);
                    draft.collapse(fieldKey);
                }}
                onOpenChange={(nextOpen) => draft.setOpenSelect(nextOpen ? fieldKey : null)}
            />
        </CollapsibleField>
    </span>
);

/** The person and unit fields of the bar, in the order an admin fills them. */
export const InviteBarFields = ({ draft, clients }: { draft: InviteDraftState; clients: InviteClients }) => {
    const { t } = useTranslation();
    const emailLabel = t('links.accountInvites.email', 'E-Mail');
    const firstNameLabel = t('links.accountInvites.firstName', 'Vorname');
    const lastNameLabel = t('links.composer.lastName', 'Name');
    const tenantLabel = t('links.composer.tenant', 'Träger');
    const agencyLabel = t('links.composer.agency', 'Beratungsstelle');
    const topicsLabel = t('links.composer.topics', 'Themen & Fachbereiche');
    const roleLabel = (value: InviteRole) => t(...ROLE_LABEL_KEYS[value]);
    const topicTitle = (value: TopicPermission) => t(...TOPIC_PERMISSION_LABEL_KEYS[value].title);
    const { email, firstName, lastName, tenant, agency } = draft;

    return (
        <>
            <CollapsibleField
                collapsed={draft.isCollapsed('email')}
                fieldKey="email"
                label={emailLabel}
                valueSummary={email.value.trim()}
                onExpand={() => draft.expand('email')}
            >
                <FloatingLabelInput
                    autoComplete="email"
                    className={styles.emailField}
                    error={email.showError || email.taken}
                    // Text, not `type="email"`: only text inputs take the caret at the end after expanding.
                    inputMode="email"
                    label={emailLabel}
                    name="recipientEmail"
                    supportingText={
                        // eslint-disable-next-line no-nested-ternary -- three mutually exclusive field states
                        email.taken
                            ? t(
                                  'links.composer.emailTaken',
                                  'Diese E-Mail-Adresse wird bereits für ein bestehendes Konto oder eine bestehende Einladung verwendet. Bitte eine andere Adresse verwenden.',
                              )
                            : email.showError
                            ? t('links.composer.emailInvalid', 'Bitte gültige E-Mail-Adresse eingeben.')
                            : undefined
                    }
                    type="text"
                    value={email.value}
                    onBlur={() => {
                        email.touch();
                        draft.collapseIfValid('email');
                    }}
                    onChange={(event) => email.set(event.target.value)}
                />
            </CollapsibleField>
            <CollapsibleField
                collapsed={draft.isCollapsed('firstName')}
                fieldKey="firstName"
                label={firstNameLabel}
                valueSummary={firstName.value.trim()}
                onExpand={() => draft.expand('firstName')}
            >
                <FloatingLabelInput
                    className={styles.nameField}
                    label={firstNameLabel}
                    name="firstName"
                    value={firstName.value}
                    onBlur={() => draft.collapseIfValid('firstName')}
                    onChange={(event) => firstName.set(event.target.value)}
                />
            </CollapsibleField>
            <CollapsibleField
                collapsed={draft.isCollapsed('lastName')}
                fieldKey="lastName"
                label={lastNameLabel}
                valueSummary={lastName.value.trim()}
                onExpand={() => draft.expand('lastName')}
            >
                <FloatingLabelInput
                    className={classNames(styles.nameField, styles.lastNameField)}
                    label={lastNameLabel}
                    name="lastName"
                    value={lastName.value}
                    onBlur={() => draft.collapseIfValid('lastName')}
                    onChange={(event) => lastName.set(event.target.value)}
                />
            </CollapsibleField>
            <SelectField<InviteRole>
                className={styles.roleField}
                disabled={draft.roleOptions.length < 2}
                draft={draft}
                fieldKey="role"
                label={t('links.composer.role', 'Rolle')}
                options={draft.roleOptions.map((option) => ({ value: option, label: roleLabel(option) }))}
                value={draft.role}
                valueLabel={roleLabel(draft.role)}
                onChange={draft.setRole}
            />
            <CollapsibleField
                collapsed={!tenant.locked && draft.isCollapsed('tenant')}
                fieldKey="tenant"
                label={tenantLabel}
                valueSummary={tenant.label}
                onExpand={() => draft.expand('tenant')}
            >
                <IdAllocationField
                    allocation={tenant.allocation}
                    allowCreate={tenant.allowCreate}
                    label={tenantLabel}
                    locked={tenant.locked}
                    resolveUnit={clients.resolveTenant}
                    searchUnits={clients.searchTenants}
                    onBlur={() => draft.collapseIfValid('tenant')}
                />
            </CollapsibleField>
            {draft.fields.agency && (
                <CollapsibleField
                    collapsed={!agency.locked && draft.isCollapsed('agency')}
                    fieldKey="agency"
                    label={agencyLabel}
                    valueSummary={agency.label}
                    onExpand={() => draft.expand('agency')}
                >
                    <IdAllocationField
                        acceptTypedIds={agency.mayBeNew}
                        allocation={agency.allocation}
                        allowCreate={agency.mayBeNew}
                        label={agencyLabel}
                        locked={agency.locked}
                        reservedJoinsPendingUnit
                        resolveUnit={clients.resolveAgency}
                        searchUnits={agency.search}
                        onBlur={() => draft.collapseIfValid('agency')}
                    />
                </CollapsibleField>
            )}
            {draft.fields.topics && (
                <SelectField<TopicPermission>
                    className={styles.topicsField}
                    draft={draft}
                    fieldKey="topics"
                    label={topicsLabel}
                    options={TOPIC_PERMISSIONS.map((option) => ({
                        value: option,
                        label: topicTitle(option),
                        description: t(...TOPIC_PERMISSION_LABEL_KEYS[option].description),
                    }))}
                    value={draft.topicPermission}
                    valueLabel={topicTitle(draft.topicPermission)}
                    onChange={draft.setTopicPermission}
                />
            )}
            {draft.fields.alsoCounsellor && (
                <SelectField<'yes' | 'no'>
                    className={styles.topicsField}
                    draft={draft}
                    fieldKey="alsoCounsellor"
                    label={t('links.composer.alsoCounsellor.label', 'Berät auch')}
                    options={(['yes', 'no'] as const).map((option) => ({
                        value: option,
                        label: t(...ALSO_COUNSELLOR_LABEL_KEYS[option].title),
                        description: t(...ALSO_COUNSELLOR_LABEL_KEYS[option].description),
                    }))}
                    value={draft.alsoCounsellor ? 'yes' : 'no'}
                    valueLabel={t(...ALSO_COUNSELLOR_LABEL_KEYS[draft.alsoCounsellor ? 'yes' : 'no'].title)}
                    onChange={(next) => draft.setAlsoCounsellor(next === 'yes')}
                />
            )}
        </>
    );
};

/** Glyph of the send button: what pressing it does — mail, filled once it will fire, or file for create-only. */
const SendGlyph = ({ sendMode, ready }: { sendMode: InviteSendMode; ready: boolean }) => {
    if (sendMode === 'createOnly') return <FileSaveIcon data-glyph="file-save" data-testid="composer-send-icon" />;
    if (ready) return <MailFilledIcon data-glyph="mail-filled" data-testid="composer-send-icon" />;
    return <MailIcon data-glyph="mail" data-testid="composer-send-icon" />;
};

interface InviteSendButtonProps {
    draft: InviteDraftState;
    submitting: boolean;
    hintId: string;
    onSelfAssign?: (agency?: IdUnitOption) => void;
}

/** The single-invite send button with its send-mode menu. */
export const InviteSendButton = ({ draft, submitting, hintId, onSelfAssign }: InviteSendButtonProps) => {
    const { t } = useTranslation();
    const menu: MenuProps = {
        items: [
            {
                key: 'direct',
                icon:
                    draft.sendMode === 'direct' ? (
                        <MailFilledIcon aria-hidden className={styles.menuIcon} data-glyph="mail-filled" />
                    ) : (
                        <MailIcon aria-hidden className={styles.menuIcon} data-glyph="mail" />
                    ),
                label: t('links.composer.sendDirect', 'Direkt Versenden'),
            },
            {
                key: 'createOnly',
                icon: <FileSaveIcon aria-hidden className={styles.menuIcon} data-glyph="file-save" />,
                label: t('links.composer.sendCreateOnly', 'Empfänger nur anlegen'),
            },
            {
                key: 'sendAndNext',
                icon: <ForwardToInboxOutlinedIcon aria-hidden className={styles.menuIcon} />,
                label: t('links.composer.sendAndNext', 'Senden & nächste'),
            },
            ...(onSelfAssign
                ? [
                      { type: 'divider' as const },
                      {
                          key: 'selfAssign',
                          icon: <PersonAddAltOutlinedIcon aria-hidden className={styles.menuIcon} />,
                          label: t('links.selfAssign.menuEntry', 'Mich selbst eintragen …'),
                      },
                  ]
                : []),
        ],
        selectable: true,
        selectedKeys: [draft.sendAndNext ? 'sendAndNext' : draft.sendMode],
        onClick: ({ key }) => {
            if (key === 'selfAssign') {
                onSelfAssign?.(draft.agency.picked);
                return;
            }
            draft.chooseSendMode(key as InviteSendMode | 'sendAndNext');
        },
    };
    return (
        <SplitButton
            icon={<SendGlyph ready={draft.isValid} sendMode={draft.sendMode} />}
            label={draft.sendLabel}
            mainDescribedBy={draft.blockReason ? hintId : undefined}
            mainDisabled={!draft.isValid || submitting}
            menu={menu}
            menuLabel={t('links.composer.sendMenuLabel', 'Sendeoptionen')}
            // Tonal disabled keeps full opacity, so not-ready rests outlined or it would look live.
            variant={draft.isValid ? 'primary' : 'outlined'}
            onClick={draft.send}
        />
    );
};

/** Why send is off, and the one-click fix for the founding rule. */
export const InviteSendHint = ({ draft, hintId }: { draft: InviteDraftState; hintId: string }) => {
    const { t } = useTranslation();
    if (!draft.blockReason) return null;
    return (
        <div className={styles.sendHintRow}>
            <p className={styles.sendHint} id={hintId} role="status">
                {draft.blockReason}
            </p>
            {draft.offerAgencyAdminSwitch && (
                <M3Button className={styles.sendHintAction} variant="text" onClick={draft.switchToAgencyAdmin}>
                    {t('links.composer.switchToAgencyAdmin', 'Stattdessen als BST-Admin einladen')}
                </M3Button>
            )}
        </div>
    );
};
