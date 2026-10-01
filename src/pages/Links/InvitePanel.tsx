import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import type { IdUnitOption } from '../../components/IdAllocationField';
import { CollapsibleField } from '../../components/CollapsibleField';
import { NavGlyph } from '../../components/NavGlyph';
import { TemplateSplitButton } from '../../components/PlaceholderTemplate';
import { ReactComponent as ArrowMenuOpenIcon } from '../../resources/img/svg/oriso/arrow_menu_open_24px.svg';
import { ReactComponent as MailIcon } from '../../resources/img/svg/oriso/mail_24px.svg';
import { ReactComponent as MailFilledIcon } from '../../resources/img/svg/oriso/mail_filled_24px.svg';
import { ReactComponent as TopicIcon } from '../../resources/img/svg/topic.svg';
import { InviteBarFields, InviteSendButton, InviteSendHint } from './InviteBar';
import type { InviteTab } from './inviteRules';
import type { InviteTemplatesProps } from './InviteToolbar';
import { useInviteBulkSend, type InviteBulkProps } from './inviteToolbarParts';
import type { CollapsibleKey, InviteClients, InviteDraftState } from './useInviteDraft';
import styles from './invitePanel.module.scss';

export const invitePanelStorageKey = (persistKey: string) => `oriso-admin.invite-panel.collapsed.${persistKey}`;

/** Whether the invite card is folded to its rail, remembered per tab. */
export const useInvitePanelCollapsed = (persistKey: string) => {
    const key = invitePanelStorageKey(persistKey);
    const [collapsed, setCollapsedState] = useState(() => {
        try {
            return window.localStorage.getItem(key) === 'true';
        } catch {
            return false;
        }
    });
    const setCollapsed = useCallback(
        (next: boolean) => {
            setCollapsedState(next);
            try {
                window.localStorage.setItem(key, String(next));
            } catch {
                // Private mode or blocked storage: the choice lasts for this visit only.
            }
        },
        [key],
    );
    return [collapsed, setCollapsed] as const;
};

type ItemState = 'done' | 'open' | 'error';

// Always valid, so they can rest as value rows; the template stays open until one is picked.
const PANEL_SELECT_KEYS: CollapsibleKey[] = ['role', 'topics', 'alsoCounsellor'];

interface ChecklistItem {
    key: CollapsibleKey | 'person';
    label: string;
    icon: ReactNode;
    state: ItemState;
    /** Optional fields show in the rail but do not count towards "n von m". */
    optional?: boolean;
}

export interface InvitePanelProps {
    tab: InviteTab;
    draft: InviteDraftState;
    clients: InviteClients;
    templates: InviteTemplatesProps;
    bulk?: InviteBulkProps;
    submitting: boolean;
    hintId: string;
    collapsed: boolean;
    onCollapsedChange: (next: boolean) => void;
    onSelfAssign?: (agency?: IdUnitOption) => void;
    className?: string;
}

/** The invite form as a card beside the table: header checklist, stacked fields, send; folds to a rail. */
export const InvitePanel = ({
    tab,
    draft,
    clients,
    templates,
    bulk,
    submitting,
    hintId,
    collapsed,
    onCollapsedChange,
    onSelfAssign,
    className,
}: InvitePanelProps) => {
    const { t } = useTranslation();
    const { pills, submit } = draft;
    const activeTemplates = templates.list.filter((template) => template.active);
    const selectedTemplate = activeTemplates.find((template) => template.id === templates.selectedId);
    const bulkSend = useInviteBulkSend({ tab, bulk, selectedTemplate, submitting, fullWidth: true });

    const stateOf = (valid: boolean, error = false): ItemState => {
        if (error) return 'error';
        return valid ? 'done' : 'open';
    };
    const items: ChecklistItem[] = [
        {
            key: 'person',
            label: t('links.panel.check.person', 'E-Mail & Name'),
            icon: <MailIcon />,
            state: stateOf(
                pills.valid.email && pills.valid.firstName && pills.valid.lastName,
                draft.email.showError || draft.email.taken,
            ),
        },
        {
            key: 'role',
            label: t('links.composer.role', 'Rolle'),
            icon: <NavGlyph name="users" />,
            state: 'done',
        },
        {
            key: 'tenant',
            label: t('links.composer.tenant', 'Träger'),
            icon: <NavGlyph name="tenants" />,
            state: stateOf(pills.valid.tenant),
        },
        ...(draft.fields.agency
            ? [
                  {
                      key: 'agency' as const,
                      label: t('links.composer.agency', 'Beratungsstelle'),
                      icon: <NavGlyph name="counseling" />,
                      state: stateOf(pills.valid.agency),
                  },
              ]
            : []),
        ...(draft.fields.topics
            ? [
                  {
                      key: 'topics' as const,
                      label: t('links.composer.topics', 'Themen & Fachbereiche'),
                      icon: <TopicIcon />,
                      state: 'done' as const,
                      optional: true,
                  },
              ]
            : []),
        {
            key: 'template',
            label: t('links.panel.check.template', 'E-Mail-Vorlage'),
            icon: <DescriptionOutlinedIcon />,
            state: stateOf(pills.valid.template),
        },
    ];
    const required = items.filter((item) => !item.optional);
    const done = required.filter((item) => item.state === 'done').length;
    const missing = required.filter((item) => item.state !== 'done').map((item) => item.label);
    const summary = missing.length
        ? t('links.panel.missing', 'Noch offen: {{fields}} · {{done}} von {{total}}', {
              fields: missing.join(', '),
              done,
              total: required.length,
          })
        : t('links.panel.ready', 'Alles bereit · {{done}} von {{total}}', { done, total: required.length });
    const title =
        tab === 'tenant'
            ? t('links.panel.title.tenant', 'Träger-Admin einladen')
            : t('links.panel.title.counsellor', 'Berater:in einladen');

    // The card shows selects as value rows (board M); one opens only while its menu is up.
    useEffect(() => {
        if (pills.openSelect != null) return;
        PANEL_SELECT_KEYS.forEach((key) => {
            if (!pills.isCollapsed(key)) pills.collapse(key);
        });
    });

    // A rail button opens the card on its field: the focus waits for the card to render.
    const pendingFocus = useRef<string | null>(null);
    useEffect(() => {
        const body = draft.row.ref.current;
        if (collapsed || !pendingFocus.current || !body) return;
        const key = pendingFocus.current === 'person' ? 'email' : pendingFocus.current;
        pendingFocus.current = null;
        const slot = body.querySelector<HTMLElement>(`[data-field-key="${key}"]`);
        slot?.querySelector<HTMLElement>('input:not([type="hidden"]), button:not([disabled])')?.focus();
    }, [collapsed, draft.row.ref]);
    const openOn = (key: ChecklistItem['key']) => {
        pendingFocus.current = key;
        if (key === 'person') {
            pills.expand('email');
            pills.expand('firstName');
            pills.expand('lastName');
        } else if (key !== 'tenant' && key !== 'agency') {
            pills.expand(key);
        }
        onCollapsedChange(false);
    };

    const toggle = (
        <button
            aria-expanded={!collapsed}
            aria-label={
                collapsed
                    ? t('links.panel.expand', 'Formular ausklappen')
                    : t('links.panel.collapse', 'Formular einklappen')
            }
            className={classNames(styles.toggle, { [styles.toggleOpen]: !collapsed })}
            title={
                collapsed
                    ? t('links.panel.expand', 'Formular ausklappen')
                    : t('links.panel.collapseHint', 'Formular einklappen – die Tabelle bekommt mehr Platz')
            }
            type="button"
            onClick={() => onCollapsedChange(!collapsed)}
        >
            <ArrowMenuOpenIcon aria-hidden />
        </button>
    );
    const avatar = (
        <span aria-hidden className={styles.avatar}>
            <PersonAddAltOutlinedIcon />
        </span>
    );

    if (collapsed) {
        return (
            <section aria-label={title} className={classNames(styles.rail, className)} data-collapsed>
                {toggle}
                <span title={title}>{avatar}</span>
                <span className={classNames(styles.railCount, { [styles.railCountMissing]: missing.length > 0 })}>
                    {t('links.panel.count', '{{done}}/{{total}}', { done, total: required.length })}
                </span>
                <span aria-hidden className={styles.railDivider} />
                {items.map((item) => (
                    <button
                        key={item.key}
                        aria-label={item.label}
                        className={classNames(styles.railItem, styles[`railItem_${item.state}`])}
                        title={item.label}
                        type="button"
                        onClick={() => openOn(item.key)}
                    >
                        {item.icon}
                    </button>
                ))}
                <span aria-hidden className={styles.railDivider} />
                <button
                    aria-label={submit.label}
                    className={classNames(styles.railSend, { [styles.railSendReady]: submit.isValid })}
                    disabled={submitting}
                    title={submit.isValid ? submit.label : submit.blockReason}
                    type="button"
                    // Not ready: open the card, whose hint says what is missing.
                    onClick={() => (submit.isValid ? submit.send() : onCollapsedChange(false))}
                >
                    {submit.isValid ? <MailFilledIcon aria-hidden /> : <MailIcon aria-hidden />}
                </button>
            </section>
        );
    }

    return (
        <section aria-label={title} className={classNames(styles.panel, className)}>
            <header className={styles.header}>
                {avatar}
                <div className={styles.titleBlock}>
                    <h3 className={styles.title}>{title}</h3>
                    <p
                        className={classNames(styles.summary, { [styles.summaryMissing]: missing.length > 0 })}
                        data-testid="invite-panel-summary"
                    >
                        {summary}
                    </p>
                </div>
                {toggle}
            </header>
            <div aria-hidden className={styles.progress}>
                {required.map((item) => (
                    <span key={item.key} className={classNames(styles.segment, styles[`segment_${item.state}`])} />
                ))}
            </div>
            <div ref={draft.row.ref} className={styles.body} onFocus={draft.row.onFocus}>
                <InviteBarFields clients={clients} draft={draft} variant="panel" />
                <span aria-hidden className={styles.divider} />
                <CollapsibleField
                    className={styles.slot}
                    collapsed={pills.isCollapsed('template')}
                    fieldKey="template"
                    icon={<DescriptionOutlinedIcon />}
                    label={t('links.panel.check.template', 'E-Mail-Vorlage')}
                    layout="row"
                    trailing={<KeyboardArrowDownIcon />}
                    valueSummary={selectedTemplate?.name}
                    onExpand={() => pills.expand('template')}
                >
                    <TemplateSplitButton
                        activeTemplateId={selectedTemplate?.id}
                        fullWidth
                        label={
                            selectedTemplate ? undefined : t('links.composer.templateChoose', 'E-Mail-Vorlage wählen')
                        }
                        size="medium"
                        templates={activeTemplates}
                        onCreateFromTemplate={
                            templates.onCreateFrom &&
                            ((id) => templates.onCreateFrom?.(typeof id === 'number' ? id : Number(id)))
                        }
                        onCreateTemplate={() => templates.onManage('create')}
                        onMainClick={() => templates.onManage('list')}
                        onSelectTemplate={(id) => {
                            templates.onSelect?.(typeof id === 'number' ? id : Number(id));
                            pills.collapse('template');
                        }}
                    />
                </CollapsibleField>
                {/* A blur on mousedown would collapse the edited field and move the button before mouseup. */}
                <div className={styles.send} onMouseDownCapture={(event) => event.preventDefault()}>
                    {bulkSend.active ? (
                        bulkSend.button
                    ) : (
                        <InviteSendButton
                            draft={draft}
                            fullWidth
                            hintId={hintId}
                            submitting={submitting}
                            onSelfAssign={onSelfAssign}
                        />
                    )}
                </div>
                {bulkSend.active ? bulkSend.hint : <InviteSendHint draft={draft} hintId={hintId} />}
            </div>
        </section>
    );
};

export default InvitePanel;
