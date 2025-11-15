import { notification } from 'antd';
import classNames from 'classnames';
import { CopyToClipboard as LibCopyToClipboard } from 'react-copy-to-clipboard';
import { useTranslation } from 'react-i18next';
import { ReactComponent as CopyIcon } from '../../resources/img/svg/copy.svg';
import styles from './styles.module.scss';

interface CopyToClipboardProps {
    className?: string;
    children: string;
    copiedKey?: string;
}

export const CopyToClipboard = ({ className, children, copiedKey }: CopyToClipboardProps) => {
    const { t } = useTranslation();

    return (
        <div className={classNames(className, styles.container)}>
            {children}
            <LibCopyToClipboard
                text={children}
                onCopy={() => notification.success({ message: t(copiedKey || 'notification.copy.success') })}
            >
                <CopyIcon className={styles.icon} />
            </LibCopyToClipboard>
        </div>
    );
};
