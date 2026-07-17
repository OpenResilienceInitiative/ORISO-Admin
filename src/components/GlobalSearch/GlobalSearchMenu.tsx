import { Dropdown, type DropdownProps } from 'antd';
import classNames from 'classnames';
import styles from './globalSearchMenu.module.scss';

export type GlobalSearchMenuProps = DropdownProps;

/**
 * antd Dropdown wrapper carrying the counselling frontend's menu look & feel
 * (ported from ORISO-Frontend `composerToolbar.styles.scss` / `flyoutMenu`):
 * 12px corner radius, 6px inner padding, M3 elevation-2 shadow and a 140ms
 * `cubic-bezier(0.2, 0, 0, 1)` scale-in opening animation. Item colours come
 * from the `--m3-*` admin theme tokens.
 */
export const GlobalSearchMenu = ({ overlayClassName, trigger = ['click'], ...props }: GlobalSearchMenuProps) => (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <Dropdown {...props} overlayClassName={classNames(styles.menu, overlayClassName)} trigger={trigger} />
);

export default GlobalSearchMenu;
