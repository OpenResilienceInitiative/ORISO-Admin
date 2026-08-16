import type { ComponentProps } from 'react';
import Icon from '@ant-design/icons';
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
