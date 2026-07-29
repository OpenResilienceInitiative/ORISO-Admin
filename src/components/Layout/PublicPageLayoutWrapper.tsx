import React, { useEffect } from 'react';
import { Layout } from 'antd';
import clsx from 'clsx';
import SiteFooter, { type SiteFooterProps } from './SiteFooter';
import getPublicTenantData from '../../api/tenant/getPublicTenantData';
import { useAppConfigContext } from '../../context/useAppConfig';

const { Content } = Layout;

export interface PublicPageLayoutWrapperTypes {
    className?: string;
    children: React.ReactNode;
    hideFooter?: boolean;
    /**
     * `stage` moves the footer menu into the bottom left of the dark stage
     * panel and adds the language entry to it (#594.15b) — the global
     * behaviour for the sign-in/sign-up surface. Pages without a stage panel
     * (404, imprint, …) keep the ordinary in-flow footer.
     */
    footerVariant?: SiteFooterProps['variant'];
}

const PublicPageLayoutWrapper = ({
    children,
    className = '',
    hideFooter,
    footerVariant,
}: PublicPageLayoutWrapperTypes) => {
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
            {!hideFooter && <SiteFooter variant={footerVariant} />}
        </Layout>
    );
};

export default PublicPageLayoutWrapper;
