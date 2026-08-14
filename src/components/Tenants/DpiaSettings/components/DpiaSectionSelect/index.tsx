import type { MenuProps } from 'antd';
import MenuBook from '@mui/icons-material/MenuBook';
import { useTranslation } from 'react-i18next';
import { SplitDropdown } from '../../../../FormPluginEditor/SplitDropdown';
import { DPIA_SECTIONS, PROPORTIONALITY_GROUP_KEY, findDpiaSection } from '../../utils/dpiaSections';

interface DpiaSectionSelectProps {
    /** Id of the section currently open in the editor. */
    value: string;
    /** Requests a switch; the host decides whether an unsaved draft blocks it. */
    onChange: (sectionId: string) => void;
    /** Marks sections that already carry text, so an admin sees what is still missing. */
    filledSectionIds?: string[];
}

/**
 * Chapter switcher for the DSFA free-text editor, rendered in the editor's lower function bar
 * (`topicSlot`) as an M3 split button: the leading segment names the open chapter, the trailing
 * caret opens the list of all free-text slots.
 *
 * The four chapter 9 stages are collected under one dropdown heading, so the menu reads as the
 * eight document sections an operator fills in rather than eleven flat entries.
 *
 * Switching only *requests* the change — the editor owns the unsaved-changes guard, because only
 * it knows whether the current draft differs from what was loaded.
 */
export const DpiaSectionSelect = ({ value, onChange, filledSectionIds = [] }: DpiaSectionSelectProps) => {
    const { t } = useTranslation();
    const selected = findDpiaSection(value);
    const filled = new Set(filledSectionIds);

    const label = (sectionId: string, chapter: string, titleKey: string) => {
        // The annex has no chapter number and its title already says "Anlagenverzeichnis",
        // so prefixing it would read "Anlage Anlagenverzeichnis".
        const prefix = chapter === 'A' ? '' : `${chapter} `;
        // A bullet marks a chapter that already has text — cheaper to scan than a second column.
        return `${prefix}${t(titleKey)}${filled.has(sectionId) ? ' •' : ''}`;
    };

    const proportionality = DPIA_SECTIONS.filter((section) => section.group === 'proportionality');
    const toItem = ({ id, chapter, titleKey }: (typeof DPIA_SECTIONS)[number]) => ({
        key: id,
        label: label(id, chapter, titleKey),
    });
    const groupItem = {
        key: 'proportionality',
        type: 'group' as const,
        label: t(PROPORTIONALITY_GROUP_KEY),
        children: proportionality.map(toItem),
    };
    const firstGroupedIndex = DPIA_SECTIONS.findIndex((section) => section.group === 'proportionality');

    // Menu order follows the registry order (the document order — see dpiaSections.ts): the four
    // chapter 9 stages collapse into one heading at the position of the FIRST grouped entry, so
    // adding or reordering a non-grouped section can never leave the group behind.
    const items: MenuProps['items'] = DPIA_SECTIONS.flatMap((section, index) => {
        if (!section.group) return [toItem(section)];
        return index === firstGroupedIndex ? [groupItem] : [];
    });

    return (
        <SplitDropdown
            icon={<MenuBook />}
            label={selected ? label(selected.id, selected.chapter, selected.titleKey) : t('dpia.sections.choose')}
            title={t('dpia.sections.choose')}
            menu={{
                selectable: true,
                selectedKeys: [value],
                items,
                onClick: ({ key }) => onChange(key),
            }}
        />
    );
};

export default DpiaSectionSelect;
