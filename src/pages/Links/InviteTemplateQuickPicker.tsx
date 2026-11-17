import type { ReactNode } from 'react';
import type { MenuProps } from 'antd';
import { useTranslation } from 'react-i18next';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { SplitButton } from '../../components/GlobalSearch/SplitButton';
import type { InviteTemplatesProps } from './InviteToolbar';
import styles from '../../components/PlaceholderTemplate/PlaceholderTemplateEditor.module.scss';

export interface InviteTemplateQuickPickerProps {
    templates: InviteTemplatesProps;
    fullWidth?: boolean;
    label?: ReactNode;
    onPicked?: () => void;
}

/** The invite shortcut lists four user choices; the main action opens the complete catalogue. */
export const InviteTemplateQuickPicker = ({
    templates,
    fullWidth,
    label,
    onPicked,
}: InviteTemplateQuickPickerProps) => {
    const { t, i18n } = useTranslation();
    const activeTemplates = templates.list.filter((template) => template.active);
    const selected = activeTemplates.find((template) => template.id === templates.selectedId);
    const recents = (templates.recentIds ?? [])
        .map((id) => activeTemplates.find((template) => template.id === id))
        .filter((template) => template != null)
        .slice(0, 4);
    const baseLanguage = (value: string) => value.toLowerCase().split(/[-_@]/)[0];
    const language = baseLanguage(i18n?.resolvedLanguage ?? i18n?.language ?? 'de');
    const kind = selected?.kind ?? activeTemplates[0]?.kind;
    // The UI also supports locales without a built-in invite. Use a system
    // translation as the starting draft, never a user's custom template.
    const defaults = activeTemplates.filter((template) => template.systemDefault && template.kind === kind);
    const standard = [language, 'en', 'de']
        .map((candidate) => defaults.find((template) => baseLanguage(template.language ?? '') === candidate))
        .find((template) => template != null);
    const row = (text: string, icon: ReactNode) => (
        <span className={styles.templateMenuRow}>
            {icon}
            <span>{text}</span>
        </span>
    );
    const menu: MenuProps = {
        items: [
            ...(recents.length
                ? [
                      {
                          type: 'group' as const,
                          label: t('links.accountInvites.recentTemplates', 'Zuletzt verwendet'),
                          children: recents.map((template) => ({
                              key: `select:${template.id}`,
                              label: row(
                                  template.name,
                                  template.id === templates.selectedId ? (
                                      <CheckRoundedIcon fontSize="small" aria-hidden />
                                  ) : (
                                      <span className={styles.templateMenuSpacer} aria-hidden />
                                  ),
                              ),
                          })),
                      },
                      { type: 'divider' as const },
                  ]
                : []),
            {
                key: 'create',
                label: row(
                    t('placeholderTemplate.template.newGroup', 'Neue Vorlage'),
                    <AddRoundedIcon fontSize="small" aria-hidden />,
                ),
            },
            {
                key: 'standard',
                label: row(
                    t('links.accountInvites.standardTemplate', 'Standardvorlage'),
                    <AddRoundedIcon fontSize="small" aria-hidden />,
                ),
                disabled: !standard || !templates.onCreateFrom,
            },
        ],
        onClick: ({ key }) => {
            if (key === 'create') templates.onManage('create');
            else if (key === 'standard' && standard) templates.onCreateFrom?.(standard.id);
            else if (key.startsWith('select:')) {
                templates.onSelect?.(Number(key.slice('select:'.length)));
                onPicked?.();
            }
        },
    };
    return (
        <SplitButton
            fullWidth={fullWidth}
            icon={<DescriptionOutlinedIcon />}
            label={label ?? selected?.name ?? t('placeholderTemplate.template.none', 'Vorlage wählen')}
            menu={menu}
            menuLabel={t('placeholderTemplate.template.menuLabel', 'Vorlagenmenü öffnen')}
            size="medium"
            variant="outlined"
            onClick={() => templates.onManage('list')}
        />
    );
};
