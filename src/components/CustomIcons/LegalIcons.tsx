import Icon from '@ant-design/icons';
import { ReactComponent as Dpa } from '../../resources/img/svg/dpa.svg';
import { ReactComponent as Gdpr } from '../../resources/img/svg/gdpr.svg';
import { ReactComponent as Imprint } from '../../resources/img/svg/imprint.svg';
import { ReactComponent as Topic } from '../../resources/img/svg/topic.svg';
import { ReactComponent as TopicFilled } from '../../resources/img/svg/topic-filled.svg';

/* eslint-disable react/jsx-props-no-spreading */

/** ORISO icon set for the legal editor cards (Icons Master File, 40px grid). */
export const DpaIcon = (props: any) => <Icon component={Dpa} {...props} />;
export const GdprIcon = (props: any) => <Icon component={Gdpr} {...props} />;
export const ImprintIcon = (props: any) => <Icon component={Imprint} {...props} />;
/** Topic / Fachbereich (24px grid) — outline + filled variant. */
export const TopicIcon = (props: any) => <Icon component={Topic} {...props} />;
export const TopicFilledIcon = (props: any) => <Icon component={TopicFilled} {...props} />;
