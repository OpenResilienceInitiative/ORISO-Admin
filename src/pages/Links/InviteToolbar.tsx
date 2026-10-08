import type { FocusEvent, ReactNode, Ref } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import type { InviteEmailTemplateDTO } from '../../api/accountInvites/accountInvites';
import { CollapsibleField } from '../../components/CollapsibleField';
import { GlobalSearchBar } from '../../components/GlobalSearch';
import { TemplateSplitButton } from '../../components/PlaceholderTemplate';
import type { InviteSendMode } from './inviteModel';
import type { InviteTab } from './inviteRules';
import { useInviteBulkSend, useInviteMoreMenu, type InviteBulkProps, type InviteCsvProps } from './inviteToolbarParts';
import styles from './inviteComposer.module.scss';

export type { InviteBulkProps, InviteCsvProps } from './inviteToolbarParts';

export interface InviteSearchProps {
    query: string;
    onChange: (query: string) => void;
    placeholder?: string;
}

export interface InviteTemplatesProps {
    list: InviteEmailTemplateDTO[];
    selectedId?: number;
    onSelect?: (templateId: number) => void;
    /** Opens the templates dialog; `list` is the picker. */
    onManage: (intent: 'create' | 'delete' | 'list') => void;
    onCreateFrom?: (templateId: number) => void;
}

interface InviteToolbarProps {
    tab: InviteTab;
    search?: InviteSearchProps;
    csv?: InviteCsvProps;
    bulk?: InviteBulkProps;
    templates: InviteTemplatesProps;
    /** The template pill folds like a bar field; the bar owns its collapse state. */
    templatePill: { collapsed: boolean; onExpand: () => void; onPicked: () => void };
    /** The send mode the CSV import captures and whether a template is chosen for it. */
    sendMode: InviteSendMode;
    submitting: boolean;
    /** The bar's fields; the single-invite send button; the hint below the row. */
    children: ReactNode;
    send: ReactNode;
    hint: ReactNode;
    rootRef?: Ref<HTMLDivElement>;
    onFocus?: (event: FocusEvent<HTMLDivElement>) => void;
    className?: string;
}

/** The row around the bar: more-menu (CSV, delete), search, template pill, send or bulk send, hint. */
export const InviteToolbar = ({
    tab,
    search,
    csv,
    bulk,
    templates,
    templatePill,
    sendMode,
    submitting,
    children,
    send,
    hint,
    rootRef,
    onFocus,
    className,
}: InviteToolbarProps) => {
    const { t } = useTranslation();
    const activeTemplates = templates.list.filter((template) => template.active);
    const selectedTemplate = activeTemplates.find((template) => template.id === templates.selectedId);
    const { moreButton, csvInput } = useInviteMoreMenu({ tab, csv, bulk, sendMode, selectedTemplate });
    const bulkSend = useInviteBulkSend({ tab, bulk, selectedTemplate, submitting });

    return (
        <div ref={rootRef} className={classNames(styles.composer, className)} onFocus={onFocus}>
            {csvInput}
            <GlobalSearchBar
                leading={moreButton}
                scrollButtons
                stackOnPhone
                searchPlaceholder={search?.placeholder}
                // Enter resolves to the same handler: the list already filters as you type.
                value={search ? search.query : undefined}
                onSearch={search?.onChange}
                onSearchChange={search?.onChange}
            >
                {children}
                <CollapsibleField
                    collapsed={templatePill.collapsed}
                    fieldKey="template"
                    label={t('links.composer.template', 'Vorlage')}
                    pillText={selectedTemplate?.name}
                    valueSummary={selectedTemplate?.name}
                    onExpand={templatePill.onExpand}
                >
                    <TemplateSplitButton
                        activeTemplateId={selectedTemplate?.id}
                        templates={activeTemplates}
                        onCreateFromTemplate={
                            templates.onCreateFrom &&
                            ((id) => templates.onCreateFrom?.(typeof id === 'number' ? id : Number(id)))
                        }
                        onCreateTemplate={() => templates.onManage('create')}
                        onMainClick={() => templates.onManage('list')}
                        onSelectTemplate={(id) => {
                            templates.onSelect?.(typeof id === 'number' ? id : Number(id));
                            templatePill.onPicked();
                        }}
                        // Match the row's 56px SplitButtons; the chooser defaults to the legal editors' 40px pill.
                        size="medium"
                    />
                </CollapsibleField>
                {/* A blur on mousedown would collapse the edited field and slide the button away before mouseup. */}
                <span className={styles.sendSlot} onMouseDownCapture={(event) => event.preventDefault()}>
                    {bulkSend.active ? bulkSend.button : send}
                </span>
            </GlobalSearchBar>
            {bulkSend.active ? bulkSend.hint : hint}
        </div>
    );
};
