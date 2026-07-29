import React, { useEffect } from 'react';
import { Layout } from 'antd';
import clsx from 'clsx';
import SiteFooter from './SiteFooter';
import getPublicTenantData from '../../api/tenant/getPublicTenantData';
import { useAppConfigContext } from '../../context/useAppConfig';

const { Content } = Layout;

export interface PublicPageLayoutWrapperTypes {
    className?: string;
    children: React.ReactNode;
    hideFooter?: boolean;
}

const PublicPageLayoutWrapper = ({ children, className = '', hideFooter }: PublicPageLayoutWrapperTypes) => {
    const { settings } = useAppConfigContext();

    useEffect(() => {
        getPublicTenantData(settings);
    }, []);

    return (
        // `publicLayout` bounds the page to the viewport and makes it its own
        // scroll container — the app shell locks document scrolling, so without
        // it any public page taller than the viewport is simply truncated
        // (#569: the tenant-admin onboarding form and its primary action were
        // unreachable on 390x844). See styles/components/publicLayout.less.
        <Layout className="publicLayout">
            <Content className={clsx('publicContent', className)}>{children}</Content>
            {!hideFooter && <SiteFooter />}
        </Layout>
    );
};

export default PublicPageLayoutWrapper;
