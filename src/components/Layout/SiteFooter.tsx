import React from 'react';
import { Menu } from 'antd';

import { Footer } from 'antd/es/layout/layout';
import { useTranslation } from 'react-i18next';

const SiteFooter = () => {
    const { t } = useTranslation();
    const items = [
        {
            label: <span>{t('footer.label.imprint')}</span>,
            key: 'item-1',
        },
        { label: ' | ', key: 'split' },
        {
            label: <span>{t('footer.label.privacy')}</span>,
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
