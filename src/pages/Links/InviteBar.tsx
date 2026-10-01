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
    pills: InviteDraftState['pills'];
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
    pills,
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
            collapsed={pills.isCollapsed(fieldKey)}
            disabled={disabled}
            fieldKey={fieldKey}
            label={label}
            pillText={valueLabel}
            valueSummary={valueLabel}
            onExpand={() => {
                pills.expand(fieldKey);
                pills.setOpenSelect(fieldKey);
            }}
        >
            <FloatingLabelSelect<V>
                className={className}
                disabled={disabled}
                label={label}
                open={pills.openSelect === fieldKey}
                optionRender={renderOptionWithHint}
                options={options}
                popupMatchSelectWidth={false}
                value={value}
                onChange={(next) => {
                    onChange(next);
                    pills.setOpenSelect(null);
                    pills.collapse(fieldKey);
                }}
                onOpenChange={(nextOpen) => pills.setOpenSelect(nextOpen ? fieldKey : null)}
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
    const { email, firstName, lastName, role, tenant, agency, topics, alsoCounsellor, pills } = draft;

    return (
        <>
            <CollapsibleField
                collapsed={pills.isCollapsed('email')}
                fieldKey="email"
                label={emailLabel}
                valueSummary={email.value.trim()}
                onExpand={() => pills.expand('email')}
            >
                <FloatingLabelInput
                    // A third person's address: the browser must not offer the admin's own saved ones.
                    autoComplete="off"
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
                        pills.collapseIfValid('email');
                    }}
                    onChange={(event) => email.set(event.target.value)}
                />
            </CollapsibleField>
            <CollapsibleField
                collapsed={pills.isCollapsed('firstName')}
                fieldKey="firstName"
                label={firstNameLabel}
                valueSummary={firstName.value.trim()}
                onExpand={() => pills.expand('firstName')}
            >
                <FloatingLabelInput
                    className={styles.nameField}
                    label={firstNameLabel}
                    name="firstName"
                    value={firstName.value}
                    onBlur={() => pills.collapseIfValid('firstName')}
                    onChange={(event) => firstName.set(event.target.value)}
                />
            </CollapsibleField>
            <CollapsibleField
                collapsed={pills.isCollapsed('lastName')}
                fieldKey="lastName"
                label={lastNameLabel}
                valueSummary={lastName.value.trim()}
                onExpand={() => pills.expand('lastName')}
            >
                <FloatingLabelInput
                    className={classNames(styles.nameField, styles.lastNameField)}
                    label={lastNameLabel}
                    name="lastName"
                    value={lastName.value}
                    onBlur={() => pills.collapseIfValid('lastName')}
                    onChange={(event) => lastName.set(event.target.value)}
                />
            </CollapsibleField>
            <SelectField<InviteRole>
                className={styles.roleField}
                disabled={role.options.length < 2}
                fieldKey="role"
                label={t('links.composer.role', 'Rolle')}
                options={role.options.map((option) => ({ value: option, label: roleLabel(option) }))}
                pills={pills}
                value={role.value}
                valueLabel={roleLabel(role.value)}
                onChange={role.set}
            />
            <CollapsibleField
                collapsed={!tenant.locked && pills.isCollapsed('tenant')}
                fieldKey="tenant"
                label={tenantLabel}
                valueSummary={tenant.label}
                onExpand={() => pills.expand('tenant')}
            >
                <IdAllocationField
                    allocation={tenant.allocation}
                    allowCreate={tenant.allowCreate}
                    label={tenantLabel}
                    locked={tenant.locked}
                    resolveUnit={clients.resolveTenant}
                    searchUnits={clients.searchTenants}
                    onBlur={() => pills.collapseIfValid('tenant')}
                />
            </CollapsibleField>
            {draft.fields.agency && (
                <CollapsibleField
                    collapsed={!agency.locked && pills.isCollapsed('agency')}
                    fieldKey="agency"
                    label={agencyLabel}
                    valueSummary={agency.label}
                    onExpand={() => pills.expand('agency')}
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
                        onBlur={() => pills.collapseIfValid('agency')}
                    />
                </CollapsibleField>
            )}
            {draft.fields.topics && (
                <SelectField<TopicPermission>
                    className={styles.topicsField}
                    fieldKey="topics"
                    label={topicsLabel}
                    options={TOPIC_PERMISSIONS.map((option) => ({
                        value: option,
                        label: topicTitle(option),
                        description: t(...TOPIC_PERMISSION_LABEL_KEYS[option].description),
                    }))}
                    pills={pills}
                    value={topics.value}
                    valueLabel={topicTitle(topics.value)}
                    onChange={topics.set}
                />
            )}
            {draft.fields.alsoCounsellor && (
                <SelectField<'yes' | 'no'>
                    className={styles.topicsField}
                    fieldKey="alsoCounsellor"
                    label={t('links.composer.alsoCounsellor.label', 'Berät auch')}
                    options={(['yes', 'no'] as const).map((option) => ({
                        value: option,
                        label: t(...ALSO_COUNSELLOR_LABEL_KEYS[option].title),
                        description: t(...ALSO_COUNSELLOR_LABEL_KEYS[option].description),
                    }))}
                    pills={pills}
                    value={alsoCounsellor.value ? 'yes' : 'no'}
                    valueLabel={t(...ALSO_COUNSELLOR_LABEL_KEYS[alsoCounsellor.value ? 'yes' : 'no'].title)}
                    onChange={(next) => alsoCounsellor.set(next === 'yes')}
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
    const { submit } = draft;
    const menu: MenuProps = {
        items: [
            {
                key: 'direct',
                icon:
                    submit.mode === 'direct' ? (
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
        selectedKeys: [submit.andNext ? 'sendAndNext' : submit.mode],
        onClick: ({ key }) => {
            if (key === 'selfAssign') {
                onSelfAssign?.(draft.agency.picked);
                return;
            }
            submit.chooseMode(key as InviteSendMode | 'sendAndNext');
        },
    };
    return (
        <SplitButton
            icon={<SendGlyph ready={submit.isValid} sendMode={submit.mode} />}
            label={submit.label}
            mainDescribedBy={submit.blockReason ? hintId : undefined}
            mainDisabled={!submit.isValid || submitting}
            menu={menu}
            menuLabel={t('links.composer.sendMenuLabel', 'Sendeoptionen')}
            // Tonal disabled keeps full opacity, so not-ready rests outlined or it would look live.
            variant={submit.isValid ? 'primary' : 'outlined'}
            onClick={submit.send}
        />
    );
};

/** Why send is off, and the one-click fix for the founding rule. */
export const InviteSendHint = ({ draft, hintId }: { draft: InviteDraftState; hintId: string }) => {
    const { t } = useTranslation();
    const { submit } = draft;
    if (!submit.blockReason) return null;
    return (
        <div className={styles.sendHintRow}>
            <p className={styles.sendHint} id={hintId} role="status">
                {submit.blockReason}
            </p>
            {submit.offerAgencyAdminSwitch && (
                <M3Button className={styles.sendHintAction} variant="text" onClick={submit.switchToAgencyAdmin}>
                    {t('links.composer.switchToAgencyAdmin', 'Stattdessen als BST-Admin einladen')}
                </M3Button>
            )}
        </div>
    );
};
