import classNames from 'classnames';
import { ReactNode } from 'react';
import styles from './styles.module.scss';

type BoxProps = {
    className?: string;
    contentClassName?: string;
    children: ReactNode;
};

export const Box = ({ className, contentClassName, children }: BoxProps) => {
    return (
        <div className={classNames(className, styles.box)}>
            <div className={classNames(contentClassName, styles.content)}>{children}</div>
        </div>
    );
};
