import React from 'react';
import { Header } from 'antd/es/layout/layout';
import Title from 'antd/es/typography/Title';
import { useTranslation } from 'react-i18next';

const SiteHeader = () => {
    const { t } = useTranslation();
    return (
        <Header className="siteHeader">
            <Title level={2}>{t('slogan')}</Title>
            <span>{t('subSlogan')}</span>
        </Header>
    );
};

export default SiteHeader;
