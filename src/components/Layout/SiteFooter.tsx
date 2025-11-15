import React from 'react';
import { Menu } from 'antd';

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
    const items = [
        {
            label: (
                <a href={routePathNames.imprint} target="_blank" rel="noopener noreferrer">
                    <span>{t('footer.label.imprint')}</span>
                </a>
            ),
            key: 'item-1',
        }, // remember to pass the key prop
        { label: ' | ', key: 'split' }, // which is required
        {
            label: (
                <a href={routePathNames.privacy} target="_blank" rel="noopener noreferrer">
                    <span>{t('footer.label.privacy')}</span>
                </a>
            ),
            key: 'submenu',
        },
    ];
    return (
        <Footer className="layoutFooter">
            <Menu mode="horizontal" className="footerMenu" items={items} />
        </Footer>
    );
};

export default SiteFooter;
