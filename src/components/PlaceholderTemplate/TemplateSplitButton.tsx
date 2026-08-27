import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { MenuProps } from 'antd';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { SplitButton } from '../GlobalSearch/SplitButton';
import styles from './PlaceholderTemplateEditor.module.scss';

export interface TemplateOption {
    id: number | string;
    name: string;
}

export interface TemplateSplitButtonProps {
    templates: TemplateOption[];
    /** The template currently loaded into the editor — shown on the main segment. */
    activeTemplateId?: number | string;
    onSelectTemplate: (id: number | string) => void;
    /** Offers "new from template" menu entries; omit to hide them. */
    onCreateFromTemplate?: (id: number | string) => void;
    /** Main-segment press (e.g. open a manage dialog). Optional in the pure picker. */
    onMainClick?: () => void;
    /** Read-only surfaces keep the chooser visible but inert. */
    disabled?: boolean;
    /**
     * Leading glyph naming WHAT is being templated. Defaults to the generic
     * document icon; variants whose artefact has its own house glyph pass it
     * (the consent editor passes the checkbox, because a consent sentence is
     * rendered as a checkbox label in registration).
     */
    icon?: ReactNode;
}

const SELECT_PREFIX = 'select:';
const CREATE_PREFIX = 'create:';

/**
 * Template chooser as an M3 split button (reused {@link SplitButton}, same
 * geometry as the invite composer's picker pill): the main segment names the
 * active template, the chevron opens a menu to switch templates or to start a
 * new one from an existing template — the interaction the legal editors use
 * for their language/version pickers.
 */
export const TemplateSplitButton = ({
    templates,
    activeTemplateId,
    onSelectTemplate,
    onCreateFromTemplate,
    onMainClick,
    disabled = false,
    icon = <DescriptionOutlinedIcon />,
}: TemplateSplitButtonProps) => {
    const { t } = useTranslation();
    const active = templates.find((template) => template.id === activeTemplateId);

    const selectItems = templates.map((template) => ({
        key: `${SELECT_PREFIX}${template.id}`,
        label: (
            <span className={styles.templateMenuRow}>
                {template.id === activeTemplateId ? (
                    <CheckRoundedIcon data-testid="active-template-mark" fontSize="small" aria-hidden />
                ) : (
                    <span className={styles.templateMenuSpacer} aria-hidden />
                )}
                <span>{template.name}</span>
            </span>
        ),
    }));

    const createItems = onCreateFromTemplate
        ? templates.map((template) => ({
              key: `${CREATE_PREFIX}${template.id}`,
              label: (
                  <span className={styles.templateMenuRow}>
                      <AddRoundedIcon fontSize="small" aria-hidden />
                      <span>
                          {/* The template name is literal data, not translatable prose —
                              composed outside t() so its content is never interpolated. */}
                          {t('placeholderTemplate.template.newFrom', 'Neu aus')} „{template.name}“
                      </span>
                  </span>
              ),
          }))
        : [];

    const menu: MenuProps = {
        items: [
            {
                type: 'group',
                label: t('placeholderTemplate.template.pickGroup', 'Vorlage wählen'),
                children: selectItems,
            },
            ...(createItems.length > 0
                ? [
                      { type: 'divider' as const },
                      {
                          type: 'group' as const,
                          label: t('placeholderTemplate.template.newGroup', 'Neue Vorlage'),
                          children: createItems,
                      },
                  ]
                : []),
        ],
        onClick: ({ key }) => {
            const raw = key.startsWith(SELECT_PREFIX)
                ? key.slice(SELECT_PREFIX.length)
                : key.slice(CREATE_PREFIX.length);
            // Menu keys are strings; give numeric ids back as numbers.
            const id = templates.find((template) => String(template.id) === raw)?.id ?? raw;
            if (key.startsWith(SELECT_PREFIX)) {
                onSelectTemplate(id);
            } else if (key.startsWith(CREATE_PREFIX)) {
                onCreateFromTemplate?.(id);
            }
        },
    };

    return (
        <SplitButton
            disabled={disabled}
            icon={icon}
            label={active?.name ?? t('placeholderTemplate.template.none', 'Vorlage wählen')}
            menu={menu}
            menuLabel={t('placeholderTemplate.template.menuLabel', 'Vorlagenmenü öffnen')}
            // Outlined at rest (#741, owner call on PR #727): the previous light
            // fill was the sheet's Elevated colourway — a state claim the resting
            // picker has no business making. It lifts only while its menu is open.
            variant="outlined"
            // Small (40px), not the SplitButton default medium (56px): this picker sits in
            // the same row as the legal editors' language/Fachbereich/version SplitDropdowns,
            // whose pills are 36px. At 56px it towered over them and read as the row's main
            // action, which a template chooser is not.
            size="small"
            // Without a main action the segment is inert — take it out of the
            // tab order instead of offering a button that does nothing (#727
            // post-merge review). The chevron menu stays fully interactive.
            mainDisabled={!onMainClick}
            onClick={onMainClick}
        />
    );
};
