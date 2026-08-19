import type { ComponentProps } from 'react';
import Icon from '@ant-design/icons';
import { ReactComponent as MaximizeContent } from '../../resources/img/svg/maximize-content.svg';
import { ReactComponent as MinimizeContent } from '../../resources/img/svg/minimize-content.svg';
import { ReactComponent as Published } from '../../resources/img/svg/published.svg';
import { ReactComponent as Unpublished } from '../../resources/img/svg/unpublished.svg';
import { ReactComponent as CrossReference } from '../../resources/img/svg/cross-reference.svg';
import { ReactComponent as EditOutline } from '../../resources/img/svg/edit.svg';
import { ReactComponent as EditFilled } from '../../resources/img/svg/edit-filled.svg';
import { ReactComponent as KeyboardArrowDown } from '../../resources/img/svg/keyboard-arrow-down.svg';
import { ReactComponent as VersionHistory } from '../../resources/img/svg/clock-arrow-down.svg';

/* eslint-disable react/jsx-props-no-spreading */

/**
 * ORISO editor icons (Icons Master File): all fills use currentColor so the
 * buttons control the colour (e.g. white on the red fullscreen-exit button).
 *
 * They are decoration inside labelled controls, so they are hidden from
 * assistive tech. Without this, antd's `<Icon>` wrapper renders a nameless
 * `role="img"` and axe reports role-img-alt (WCAG 1.1.1) on every editor card.
 * A caller that needs a standalone, meaningful icon can pass its own
 * `aria-hidden={false}` plus `aria-label`.
 */
type EditorIconProps = ComponentProps<typeof Icon>;
const decorative = { 'aria-hidden': true } as const;
export const MaximizeContentIcon = (props: EditorIconProps) => (
    <Icon component={MaximizeContent} {...decorative} {...props} />
);
export const MinimizeContentIcon = (props: EditorIconProps) => (
    <Icon component={MinimizeContent} {...decorative} {...props} />
);
/** Publish / draft state pair for the editor footer actions. */
export const PublishedIcon = (props: EditorIconProps) => <Icon component={Published} {...decorative} {...props} />;
export const UnpublishedIcon = (props: EditorIconProps) => <Icon component={Unpublished} {...decorative} {...props} />;
/** Edit pencil (outline + filled) — "Entwurf bearbeiten" and edit affordances. */
export const EditIcon = (props: EditorIconProps) => <Icon component={EditOutline} {...decorative} {...props} />;
export const EditFilledIcon = (props: EditorIconProps) => <Icon component={EditFilled} {...decorative} {...props} />;
/** "Insert cross reference" (Noun Project) — the anchor-link bubble trigger. */
export const CrossReferenceIcon = (props: EditorIconProps) => (
    <Icon component={CrossReference} {...decorative} {...props} />
);
export const KeyboardArrowDownIcon = (props: EditorIconProps) => (
    <Icon component={KeyboardArrowDown} {...decorative} {...props} />
);
/** Version-history clock with downward arrow (Figma Admin.ORISO 1:53273). */
export const VersionHistoryIcon = (props: EditorIconProps) => (
    <Icon component={VersionHistory} {...decorative} {...props} />
);
