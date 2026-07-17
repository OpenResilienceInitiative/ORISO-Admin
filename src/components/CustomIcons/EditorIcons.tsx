import type { ComponentProps } from 'react';
import Icon from '@ant-design/icons';
import { ReactComponent as MaximizeContent } from '../../resources/img/svg/maximize-content.svg';
import { ReactComponent as MinimizeContent } from '../../resources/img/svg/minimize-content.svg';
import { ReactComponent as Published } from '../../resources/img/svg/published.svg';
import { ReactComponent as Unpublished } from '../../resources/img/svg/unpublished.svg';
import { ReactComponent as CrossReference } from '../../resources/img/svg/cross-reference.svg';
import { ReactComponent as KeyboardArrowDown } from '../../resources/img/svg/keyboard-arrow-down.svg';

/* eslint-disable react/jsx-props-no-spreading */

/**
 * ORISO editor icons (Icons Master File): all fills use currentColor so the
 * buttons control the colour (e.g. white on the red fullscreen-exit button).
 */
type EditorIconProps = ComponentProps<typeof Icon>;
export const MaximizeContentIcon = (props: EditorIconProps) => <Icon component={MaximizeContent} {...props} />;
export const MinimizeContentIcon = (props: EditorIconProps) => <Icon component={MinimizeContent} {...props} />;
/** Publish / draft state pair for the editor footer actions. */
export const PublishedIcon = (props: EditorIconProps) => <Icon component={Published} {...props} />;
export const UnpublishedIcon = (props: EditorIconProps) => <Icon component={Unpublished} {...props} />;
/** "Insert cross reference" (Noun Project) — the anchor-link bubble trigger. */
export const CrossReferenceIcon = (props: EditorIconProps) => <Icon component={CrossReference} {...props} />;
export const KeyboardArrowDownIcon = (props: EditorIconProps) => <Icon component={KeyboardArrowDown} {...props} />;
