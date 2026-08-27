import type { ComponentProps } from 'react';
import Icon from '@ant-design/icons';
import { ReactComponent as CheckBox } from '../../resources/img/svg/check-box.svg';
import { ReactComponent as CheckBoxFilled } from '../../resources/img/svg/check-box-filled.svg';
import { ReactComponent as Dpa } from '../../resources/img/svg/dpa.svg';
import { ReactComponent as Dpia } from '../../resources/img/svg/dpia.svg';
import { ReactComponent as Gdpr } from '../../resources/img/svg/gdpr.svg';
import { ReactComponent as Imprint } from '../../resources/img/svg/imprint.svg';
import { ReactComponent as Topic } from '../../resources/img/svg/topic.svg';
import { ReactComponent as TopicFilled } from '../../resources/img/svg/topic-filled.svg';

/* eslint-disable react/jsx-props-no-spreading */

/** ORISO icon set for the legal editor cards (Icons Master File, 40px grid). */
type LegalIconProps = ComponentProps<typeof Icon>;
export const DpaIcon = (props: LegalIconProps) => <Icon component={Dpa} {...props} />;
/** DSFA / DPIA free-text editor (Docs#80 living DPIA) — 100px grid, single path. */
export const DpiaIcon = (props: LegalIconProps) => <Icon component={Dpia} {...props} />;
export const GdprIcon = (props: LegalIconProps) => <Icon component={Gdpr} {...props} />;
export const ImprintIcon = (props: LegalIconProps) => <Icon component={Imprint} {...props} />;
/** Topic / Fachbereich (24px grid) — outline + filled variant. */
export const TopicIcon = (props: LegalIconProps) => <Icon component={Topic} {...props} />;
export const TopicFilledIcon = (props: LegalIconProps) => <Icon component={TopicFilled} {...props} />;
/**
 * Consent / Einwilligung (24px grid, Icons Master File `check_box_checked` +
 * `check_box_filled`) — the registration consent sentence IS a checkbox, so the
 * checkbox is what names its template surfaces. Outline is the resting/default
 * variant, filled the selected one, matching the Topic pair above.
 */
export const CheckBoxIcon = (props: LegalIconProps) => <Icon component={CheckBox} {...props} />;
export const CheckBoxFilledIcon = (props: LegalIconProps) => <Icon component={CheckBoxFilled} {...props} />;
