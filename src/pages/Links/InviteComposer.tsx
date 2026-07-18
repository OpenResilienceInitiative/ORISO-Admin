import { useMemo, useState } from 'react';
import type { MenuProps } from 'antd';
import { useTranslation } from 'react-i18next';
import type { InviteEmailTemplateDTO } from '../../api/accountInvites/accountInvites';
import { FloatingLabelInput } from '../../components/FloatingLabelInput';
import { GlobalSearchBar } from '../../components/GlobalSearch';
import { SplitButton } from '../../components/GlobalSearch/SplitButton';
import { M3NumberField } from '../../components/M3NumberField';
import { ReactComponent as MailFilledIcon } from '../../resources/img/svg/oriso/mail_filled_24px.svg';
import { ReactComponent as SendIcon } from '../../resources/img/svg/oriso/send_400_24px.svg';
import { ReactComponent as SendFilledIcon } from '../../resources/img/svg/oriso/send_filled_24px.svg';
import styles from './inviteComposer.module.scss';

/**
 * `direct` = create the invite AND send the templated e-mail;
 * `createOnly` = create the recipient without sending (the API supports this
 * by simply omitting `templateId`).
 */
export type InviteSendMode = 'direct' | 'createOnly';

export interface InviteComposerValues {
    recipientEmail: string;
    firstName?: string;
    lastName?: string;
    tenantId?: number;
    agencyId?: number;
    /** Only set in `direct` mode — `createOnly` posts without a template. */
    templateId?: number;
    sendMode: InviteSendMode;
}

export interface InviteComposerProps {
    /** Templates of this tab's kind; only active ones are offered in the menu. */
    templates: InviteEmailTemplateDTO[];
    /** Currently selected template (lifted so the tab can reuse it, e.g. for resend). */
    templateId?: number;
    onTemplateIdChange: (templateId: number) => void;
    /** Träger tab: the Träger-ID is required, auto-suggested and collision-checked. */
    requireTenantId?: boolean;
    /**
     * Auto-suggested free Träger-ID. The field tracks this suggestion until the
     * admin edits the field; a successful submit re-arms the tracking so the
     * next free id flows in for the following invite.
     */
    suggestedTenantId?: number;
    /** Ids that must be rejected client-side (existing tenants + active invites). */
    takenTenantIds?: Set<number>;
    /** Non-Träger tabs: prefill with the admin's own tenant. */
    initialTenantId?: number;
    includeAgencyField?: boolean;
    submitting?: boolean;
    /** Discriminator for the persisted send mode (one per tab), e.g. the target role. */
    persistKey: string;
    /** Resolve `true` on success — the composer then clears its fields. */
    onSubmit: (values: InviteComposerValues) => Promise<boolean> | boolean;
    /** Open the EmailTemplatesDialog in the requested view. */
    onManageTemplates: (intent: 'create' | 'delete') => void;
    searchPlaceholder?: string;
    className?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const sendModeStorageKey = (persistKey: string) => `oriso-admin.invite-composer.send-mode.${persistKey}`;

const readPersistedSendMode = (persistKey: string): InviteSendMode => {
    try {
        return window.localStorage.getItem(sendModeStorageKey(persistKey)) === 'createOnly' ? 'createOnly' : 'direct';
    } catch {
        return 'direct';
    }
};

/**
 * Invite composer row (#314, Figma 1165:17005 middle row): minimized global
 * search pill, floating-label recipient fields, the pill-shaped Träger-ID
 * number field (auto-suggest preserved), a tonal template split button whose
 * chevron menu selects/creates/deletes templates, and the send split button.
 * The send button rests `outlined` + disabled and only turns `primary` once
 * everything is validly filled; its chevron switches the persisted send mode
 * ("Direkt Versenden" vs "Empfänger nur anlegen", saved per tab in
 * localStorage until the admin changes it again).
 */
export const InviteComposer = ({
    templates,
    templateId,
    onTemplateIdChange,
    requireTenantId = false,
    suggestedTenantId,
    takenTenantIds,
    initialTenantId,
    includeAgencyField = false,
    submitting = false,
    persistKey,
    onSubmit,
    onManageTemplates,
    searchPlaceholder,
    className,
}: InviteComposerProps) => {
    const { t } = useTranslation();
    const [recipientEmail, setRecipientEmail] = useState('');
    const [emailTouched, setEmailTouched] = useState(false);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [agencyId, setAgencyId] = useState<number | undefined>();
    // `null` = untouched → the field renders (and tracks) the suggestion / initial
    // tenant. Any admin edit (including clearing) becomes an override that is never
    // clobbered; a successful submit resets to `null` so the next suggestion flows in.
    const [tenantIdOverride, setTenantIdOverride] = useState<number | undefined | null>(null);
    const [sendMode, setSendMode] = useState<InviteSendMode>(() => readPersistedSendMode(persistKey));

    const defaultTenantId = requireTenantId ? suggestedTenantId : initialTenantId;
    const tenantId = tenantIdOverride !== null ? tenantIdOverride : defaultTenantId;

    const activeTemplates = useMemo(() => templates.filter((template) => template.active), [templates]);
    const selectedTemplate = activeTemplates.find((template) => template.id === templateId);

    const emailValid = EMAIL_PATTERN.test(recipientEmail.trim());
    const tenantIdValid = !requireTenantId || (tenantId != null && !takenTenantIds?.has(tenantId));
    const templateValid = sendMode === 'createOnly' || selectedTemplate != null;
    const isValid = emailValid && tenantIdValid && templateValid;
    const showEmailError = emailTouched && recipientEmail.length > 0 && !emailValid;

    const changeSendMode = (mode: InviteSendMode) => {
        setSendMode(mode);
        try {
            window.localStorage.setItem(sendModeStorageKey(persistKey), mode);
        } catch {
            // Storage unavailable (e.g. private mode) — the choice still holds for this session.
        }
    };

    const handleSend = async () => {
        if (!isValid || submitting) {
            return;
        }

        const succeeded = await onSubmit({
            recipientEmail: recipientEmail.trim(),
            firstName: firstName.trim() || undefined,
            lastName: lastName.trim() || undefined,
            tenantId,
            agencyId: includeAgencyField ? agencyId : undefined,
            templateId: sendMode === 'direct' ? templateId : undefined,
            sendMode,
        });

        if (succeeded) {
            setRecipientEmail('');
            setEmailTouched(false);
            setFirstName('');
            setLastName('');
            setAgencyId(undefined);
            setTenantIdOverride(null);
        }
    };

    const templateMenu: MenuProps = {
        items: [
            {
                key: 'templates',
                type: 'group',
                label: t('links.composer.templateGroup', 'E-Mail-Vorlagen auswählen oder erstellen'),
                children: activeTemplates.map((template) => ({ key: String(template.id), label: template.name })),
            },
            { key: 'divider', type: 'divider' },
            { key: 'create', label: t('links.composer.templateCreate', 'Neue E-Mail-Vorlage erstellen') },
            { key: 'delete', label: t('links.composer.templateDelete', 'E-Mail-Vorlage löschen') },
        ],
        selectable: true,
        selectedKeys: templateId != null ? [String(templateId)] : [],
        onClick: ({ key }) => {
            if (key === 'create' || key === 'delete') {
                onManageTemplates(key);
                return;
            }
            onTemplateIdChange(Number(key));
        },
    };

    const sendMenu: MenuProps = {
        items: [
            { key: 'direct', label: t('links.composer.sendDirect', 'Direkt Versenden') },
            { key: 'createOnly', label: t('links.composer.sendCreateOnly', 'Empfänger nur anlegen') },
        ],
        selectable: true,
        selectedKeys: [sendMode],
        onClick: ({ key }) => changeSendMode(key as InviteSendMode),
    };

    return (
        <GlobalSearchBar className={className} searchPlaceholder={searchPlaceholder}>
            <FloatingLabelInput
                className={styles.emailField}
                error={showEmailError}
                label={t('links.accountInvites.email', 'E-Mail')}
                name="recipientEmail"
                supportingText={
                    showEmailError
                        ? t('links.composer.emailInvalid', 'Bitte gültige E-Mail-Adresse eingeben.')
                        : undefined
                }
                type="email"
                value={recipientEmail}
                onBlur={() => setEmailTouched(true)}
                onChange={(event) => setRecipientEmail(event.target.value)}
            />
            <FloatingLabelInput
                className={styles.nameField}
                label={t('links.accountInvites.firstName', 'Vorname')}
                name="firstName"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
            />
            <FloatingLabelInput
                className={styles.nameField}
                label={t('links.composer.lastName', 'Name')}
                name="lastName"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
            />
            <M3NumberField
                label={t('links.accountInvites.tenantId', 'Träger-ID')}
                min={1}
                value={tenantId}
                onChange={setTenantIdOverride}
            />
            {includeAgencyField && (
                <M3NumberField
                    label={t('links.accountInvites.agencyId', 'Beratungsstellen-ID')}
                    min={1}
                    value={agencyId}
                    onChange={setAgencyId}
                />
            )}
            <SplitButton
                icon={<MailFilledIcon />}
                label={selectedTemplate?.name ?? t('links.composer.templatePlaceholder', 'E-Mail-Vorlage')}
                menu={templateMenu}
                menuLabel={t('links.composer.templateMenuLabel', 'E-Mail-Vorlage wählen')}
                variant="tonal"
            />
            <SplitButton
                icon={isValid ? <SendFilledIcon /> : <SendIcon />}
                label={
                    sendMode === 'direct'
                        ? t('links.composer.sendDirect', 'Direkt Versenden')
                        : t('links.composer.sendCreateOnly', 'Empfänger nur anlegen')
                }
                mainDisabled={!isValid || submitting}
                menu={sendMenu}
                menuLabel={t('links.composer.sendMenuLabel', 'Sendeoptionen')}
                variant={isValid ? 'primary' : 'outlined'}
                onClick={handleSend}
            />
        </GlobalSearchBar>
    );
};

export default InviteComposer;
