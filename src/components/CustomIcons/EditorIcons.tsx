import Icon from '@ant-design/icons';
import { ReactComponent as MaximizeContent } from '../../resources/img/svg/maximize-content.svg';
import { ReactComponent as MinimizeContent } from '../../resources/img/svg/minimize-content.svg';

/* eslint-disable react/jsx-props-no-spreading */

/**
 * ORISO editor icons (Icons Master File, 20px grid): maximize/minimize the
 * text editor content — used by the M3 editor's fullscreen toggle. The fills
 * use currentColor so the exit state can render white on the red button.
 */
export const MaximizeContentIcon = (props: any) => <Icon component={MaximizeContent} {...props} />;
export const MinimizeContentIcon = (props: any) => <Icon component={MinimizeContent} {...props} />;
