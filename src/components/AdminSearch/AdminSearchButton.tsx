import SearchIcon from '@mui/icons-material/Search';
import classNames from 'classnames';
import type { MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdminSearch } from './AdminSearchProvider';
import styles from './adminSearchButton.module.scss';

const isMac = () =>
    typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent);

export interface AdminSearchButtonProps {
    className?: string;
    /**
     * `bar` is the Material 3 search bar (a wide pill with the placeholder and the shortcut, centred
     * above the page); `icon` is the round icon button.
     */
    variant?: 'bar' | 'icon';
    /** Override for stories; defaults to opening the provider's search view. */
    onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}

/**
 * Opens the admin search. It only opens the view; the keyboard shortcuts (Ctrl/Cmd+K and /) are
 * handled by `AdminSearchProvider`.
 */
export const AdminSearchButton = ({ className, variant = 'icon', onClick }: AdminSearchButtonProps) => {
    const { t } = useTranslation();
    const { open } = useAdminSearch();
    const label = t('adminSearch.open');
    const shortcut = isMac() ? '⌘K' : 'Ctrl+K';
    const handleClick = (event: MouseEvent<HTMLButtonElement>) =>
        onClick ? onClick(event) : open(event.currentTarget);

    return (
        <button
            type="button"
            className={classNames(variant === 'bar' ? styles.bar : styles.button, className)}
            onClick={handleClick}
            // The bar shows its own text; a shorter aria-label would not contain it (WCAG 2.5.3, Label in Name).
            aria-label={variant === 'icon' ? label : undefined}
            aria-keyshortcuts="Control+K Meta+K /"
            title={t('adminSearch.shortcut', { keys: shortcut })}
            data-admin-search-button
        >
            <SearchIcon />
            {variant === 'bar' && (
                <>
                    <span className={styles.placeholder}>{t('adminSearch.placeholder')}</span>
                    <kbd className={styles.keys}>{shortcut}</kbd>
                </>
            )}
        </button>
    );
};

export default AdminSearchButton;
