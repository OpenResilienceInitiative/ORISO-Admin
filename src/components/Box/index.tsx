import classNames from 'classnames';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import styles from './styles.module.scss';

type BoxProps = HTMLAttributes<HTMLDivElement> & {
    contentClassName?: string;
    children: ReactNode;
};

export const Box = forwardRef<HTMLDivElement, BoxProps>(({ className, contentClassName, children, ...rest }, ref) => (
    <div ref={ref} className={classNames(className, styles.box)} {...rest}>
        <div className={classNames(contentClassName, styles.content)}>{children}</div>
    </div>
));

Box.displayName = 'Box';
