import SvgIcon, { type SvgIconProps } from '@mui/material/SvgIcon';
import { ReactComponent as KeyboardArrowDown } from '../../resources/img/svg/keyboard-arrow-down.svg';

/** Keep MUI's icon sizing and positioning while using the shared ORISO glyph. */
export const MuiSelectChevron = (props: SvgIconProps) => (
    <SvgIcon {...props} component={KeyboardArrowDown} inheritViewBox />
);
