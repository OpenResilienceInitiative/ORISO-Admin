import React from 'react';

import { Footer } from 'antd/es/layout/layout';
import { useTranslation } from 'react-i18next';
import routePathNames from '../../appConfig';

/*
 * ATTENTION: these links will not work on local maschines.
 * to make them work on LIVE/DEV they link to a route "outside / above" the scope of of this admin console,
 * but on the same host.
 * locally we have 2 seperated repos / applications
 * example:
 * https://tenant1.onlineberatung.net/impressum is the Imprint page
 * https://tenant1.onlineberatung.net/admin/settings ist the admin console settings page
 *
 */

const SiteFooter = () => {
    const { t } = useTranslation();
    return (
        <Footer className="layoutFooter">
            <nav className="footerMenu" aria-label="Legal">
                <a href={routePathNames.imprint} target="_blank" rel="noopener noreferrer">
                    {t('footer.label.imprint')}
                </a>
                <span className="footerMenu__separator" aria-hidden="true">
                    |
                </span>
                <a href={routePathNames.privacy} target="_blank" rel="noopener noreferrer">
                    {t('footer.label.privacy')}
                </a>
            </nav>
        </Footer>
    );
};

export default SiteFooter;
