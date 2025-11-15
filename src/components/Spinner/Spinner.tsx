import * as React from 'react';
import clsx from 'clsx';

export interface SpinnerProps {
    isDark?: boolean;
    className?: string;
}

const Spinner = ({ isDark = false, className = '' }: SpinnerProps) => {
    return (
        <div className={clsx('spinner', isDark && 'dark', className)}>
            <div className="double-bounce1" />
            <div className="double-bounce2" />
        </div>
    );
};

export default Spinner;
