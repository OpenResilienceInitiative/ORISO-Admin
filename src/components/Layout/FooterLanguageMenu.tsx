import { useState } from 'react';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { useTranslation } from 'react-i18next';
import CheckIcon from '@mui/icons-material/Check';
import { ReactComponent as LanguageIcon } from '../../resources/img/svg/navbar/languages_active.svg';
import { useLanguage } from '../../hooks/useLanguage';
import { isSupportedLanguage } from '../../utils/language';
import styles from './footerLanguageMenu.module.scss';

/**
 * The language control of the public footer.
 *
 * It used to be a *submenu entry* of the footer's antd `Menu` — a language
 * combobox smuggled in as a menu item. That is what produced the three
 * defects in the 100%-zoom review:
 *
 *  - the entry carried the full `(DE) Deutsch` label plus a submenu arrow, so
 *    the three-entry row no longer fitted the 40vw stage panel and wrapped
 *    onto a second line;
 *  - opening it painted antd's horizontal-menu active bar — the red underline
 *    under the entry, which reads as a validation error on a login screen;
 *  - the submenu popup is anchored to the *left edge* of its entry, so the
 *    options floated off to the side of the trigger instead of over it.
 *
 * It is now its own control with a fixed footprint: a real `button` with the
 * globe and the language code, and a `Dropdown` anchored `top` — antd centres
 * `top` on the trigger, which is exactly the "menu centred over the button"
 * the review asked for. The full language names stay where they belong: in
 * the options, with a check mark on the active one.
 */
export const FooterLanguageMenu = () => {
    const { t } = useTranslation();
    const { language, options, changeLanguage } = useLanguage();
    const [open, setOpen] = useState(false);

    const current = options.find((option) => option.value === language);

    const items: MenuProps['items'] = options.map((option) => ({
        key: option.value,
        label: (
            <span className={styles.option}>
                <span className={styles.optionCheck} aria-hidden>
                    {option.value === language && <CheckIcon fontSize="inherit" />}
                </span>
                {option.label}
            </span>
        ),
    }));

    const handleClick: MenuProps['onClick'] = ({ key }) => {
        if (isSupportedLanguage(key)) {
            changeLanguage(key);
        }
        setOpen(false);
    };

    return (
        <Dropdown
            open={open}
            onOpenChange={setOpen}
            trigger={['click']}
            /* `top` is the centred placement in antd; `topLeft` is the anchored
               one the old submenu effectively used. */
            placement="top"
            overlayClassName={styles.popup}
            menu={{ items, selectedKeys: [language], onClick: handleClick }}
        >
            <button
                type="button"
                /* `footerLanguage` is the stable, unhashed hook the footer's
                   own stylesheet uses to give this control the typography of
                   the row it sits in (white + bold + uppercase on the stage
                   panel, plain on the in-flow footer). */
                className={`footerLanguage ${styles.trigger}`}
                /* antd's Dropdown only clones `className`/`disabled`/`ref` onto
                   its trigger — it does NOT add the popup state. Declaring it
                   here is what tells a screen reader the button opens a menu
                   and whether it is open, and it is what the open-state style
                   below hangs off. Same pattern as `components/PillSelect`. */
                aria-haspopup="menu"
                aria-expanded={open}
                /* The trigger shows the code so the row keeps a fixed, narrow
                   footprint; the accessible name still carries the full name. */
                aria-label={`${t('language.selectAriaLabel')}: ${current?.label ?? language}`}
                title={current?.label ?? language}
            >
                <LanguageIcon className={styles.icon} aria-hidden />
                <span className={styles.code}>{language.toUpperCase()}</span>
            </button>
        </Dropdown>
    );
};

export default FooterLanguageMenu;
