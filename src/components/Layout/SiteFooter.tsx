import React, { useState } from 'react';
import { Menu } from 'antd';
import type { MenuProps } from 'antd';

import { Footer } from 'antd/es/layout/layout';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { runtimeConfig } from '../../config/runtimeConfig';
import { FooterLanguageMenu } from './FooterLanguageMenu';
import { LegalNoticeDialog } from './LegalNoticeDialog';
import { LEGAL_NOTICE_KINDS, type LegalNoticeKind } from './legalNoticeContent';

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
 * The site footer — Imprint, Privacy and (on the public surface) the language
 * control.
 *
 * Until #594.15b every entry here was dead: the antd items carried a label and
 * a placeholder key (`item-1`, `split`, `submenu`) and no handler at all, so
 * clicking Imprint or Privacy did nothing and the red underline was only antd's
 * default selection state. The keys are now meaningful, both legal entries open
 * their own dialog, and the `' | '` pseudo-item is gone: a separator is styling,
 * not a focusable entry announced to screen readers.
 *
 * The language control is deliberately NOT a fourth item of this menu any more
 * (see {@link FooterLanguageMenu}). A menu of legal texts and a language
 * selector are two different things; making the selector a submenu is what made
 * the row wrap, painted antd's red active bar under it, and anchored its popup
 * to the side of the trigger instead of over it.
 */
const SiteFooter = ({ variant = 'default' }: SiteFooterProps) => {
    const { t } = useTranslation();
    const [openNotice, setOpenNotice] = useState<LegalNoticeKind | null>(null);
    const isStage = variant === 'stage';

    const items: MenuProps['items'] = LEGAL_NOTICE_KINDS.map((kind) => ({
        label: <span>{t(`footer.label.${kind}`)}</span>,
        key: kind,
    }));

    const handleClick: MenuProps['onClick'] = ({ key }) => {
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
            {isStage && <FooterLanguageMenu />}
            {runtimeConfig.platformVersion && <span className="platformVersion">{runtimeConfig.platformVersion}</span>}
            {openNotice && <LegalNoticeDialog kind={openNotice} onClose={() => setOpenNotice(null)} />}
        </Footer>
    );
};

export default SiteFooter;
