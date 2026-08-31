import type { PropsWithChildren } from 'react';
import classNames from 'classnames';
import styles from './PermissionsStoryFrame.module.scss';

export const PermissionsStoryFrame = ({ children, wide = false }: PropsWithChildren<{ wide?: boolean }>) => (
    <div className={classNames(styles.frame, { [styles.wide]: wide })}>{children}</div>
);
