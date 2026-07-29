import React, { useState } from 'react';
import { Menu } from 'antd';
import type { MenuProps } from 'antd';

import { Footer } from 'antd/es/layout/layout';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { runtimeConfig } from '../../config/runtimeConfig';
import { useLanguage } from '../../hooks/useLanguage';
import { isSupportedLanguage } from '../../utils/language';
import { LegalNoticeDialog } from './LegalNoticeDialog';
import { LEGAL_NOTICE_KINDS, type LegalNoticeKind } from './legalNoticeContent';

const LANGUAGE_KEY_PREFIX = 'language:';

export interface SiteFooterProps {
    /**
     * `default` — the in-flow footer at the bottom of the page (protected
     * layout, error pages).
     *
     * `stage` — the public sign-in/sign-up surface (#594.15b). The SAME menu,
     * moved to the bottom LEFT of the dark stage panel and rendered in white,
     * globally for the public surface. Below the desktop breakpoint the stage
     * panel has slid off-canvas, so the footer falls back to the in-flow
     * position — the menu is never lost on a phone.
     */
    variant?: 'default' | 'stage';
}

/**
 * The site footer menu — Imprint, Privacy and (on the public surface) the
 * language selector as a third entry of the same menu.
 *
 * Until #594.15b every entry here was dead: the antd items carried a label and
 * a placeholder key (`item-1`, `split`, `submenu`) and no handler at all, so
 * clicking Imprint or Privacy did nothing and the red underline was only antd's
 * default selection state. The keys are now meaningful, both legal entries open
 * their own dialog, and the `' | '` pseudo-item is gone: a separator is styling,
 * not a focusable entry announced to screen readers.
 */
const SiteFooter = ({ variant = 'default' }: SiteFooterProps) => {
    const { t } = useTranslation();
    const { language, options, changeLanguage } = useLanguage();
    const [openNotice, setOpenNotice] = useState<LegalNoticeKind | null>(null);
    const isStage = variant === 'stage';

    const items: MenuProps['items'] = [
        ...LEGAL_NOTICE_KINDS.map((kind) => ({
            label: <span>{t(`footer.label.${kind}`)}</span>,
            key: kind,
        })),
        // The language selector IS an entry of this menu, not a control floating
        // next to it (#594.15b) — as a submenu, so the options stay real menu
        // items instead of a combobox nested inside a menuitem.
        ...(isStage
            ? [
                  {
                      label: <span>{options.find((option) => option.value === language)?.label ?? language}</span>,
                      key: 'language',
                      children: options.map((option) => ({
                          label: option.label,
                          key: `${LANGUAGE_KEY_PREFIX}${option.value}`,
                      })),
                  },
              ]
            : []),
    ];

    const handleClick: MenuProps['onClick'] = ({ key }) => {
        if (key.startsWith(LANGUAGE_KEY_PREFIX)) {
            const next = key.slice(LANGUAGE_KEY_PREFIX.length);
            if (isSupportedLanguage(next)) {
                changeLanguage(next);
            }
            return;
        }

        if ((LEGAL_NOTICE_KINDS as readonly string[]).includes(key)) {
            setOpenNotice(key as LegalNoticeKind);
        }
    };

    return (
        <Footer className={clsx('layoutFooter', isStage && 'stageFooter')}>
            <Menu
                mode="horizontal"
                className="footerMenu"
                items={items}
                onClick={handleClick}
                selectable={false}
                disabledOverflow
                aria-label={t('footer.ariaLabel')}
            />
            {runtimeConfig.platformVersion && <span className="platformVersion">{runtimeConfig.platformVersion}</span>}
            {openNotice && <LegalNoticeDialog kind={openNotice} onClose={() => setOpenNotice(null)} />}
        </Footer>
    );
};

export default SiteFooter;
