import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import PublicPageLayoutWrapper from '../components/Layout/PublicPageLayoutWrapper';

export const Error404 = () => {
    const { t } = useTranslation();

    return (
        <PublicPageLayoutWrapper>
            <div className="error404">
                <h1 className="head-404">404</h1>
                <h5>{t('errorPages.notFound.description')}</h5>

                <Link to="/">{t('toHomePage')}</Link>
            </div>
        </PublicPageLayoutWrapper>
    );
};
