import { Col, Row } from 'antd';
import { ThemeProvider } from '@mui/material/styles';
import PublicPageLayoutWrapper from '../../components/Layout/PublicPageLayoutWrapper';
import { LanguageSelector } from '../../components/LanguageSelector';
import { usePublicTenantData } from '../../hooks/usePublicTenantData.hook';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import Stage from '../Login/Stage';

export interface PasswordResetPageLayoutProps {
    children: React.ReactNode;
    /**
     * `login` (default): short, vertically centred form — the branding stage
     * plays its full-viewport intro on small screens, as on the login page.
     *
     * `longForm`: the page hosts a tall multi-step form (tenant-admin
     * onboarding, #569). The form is aligned to the top of the column and the
     * stage is reduced to a desktop-only side panel, so nothing covers the
     * fields or the primary action on a phone. Scrolling itself is provided by
     * PublicPageLayoutWrapper for every public page.
     */
    variant?: 'login' | 'longForm';
}

export const PasswordResetPageLayout = ({ children, variant = 'login' }: PasswordResetPageLayoutProps) => {
    const { data: tenantData } = usePublicTenantData();
    const isLongForm = variant === 'longForm';

    return (
        <PublicPageLayoutWrapper className="login flex-col flex">
            <div className="loginLanguageSelector">
                <LanguageSelector variant="login" ariaLabelKey="language.loginSelectAriaLabel" />
            </div>
            <Stage logo={tenantData?.theming?.logo} claim={tenantData?.content?.claim} overlay={!isLongForm} />
            <Row align={isLongForm ? 'top' : 'middle'} style={{ flex: '1 0 auto' }}>
                <Col xs={{ span: 20, offset: 2 }} md={{ span: 8, offset: 2 }} xl={{ span: 6, offset: 5 }}>
                    <ThemeProvider theme={orisoMuiTheme}>{children}</ThemeProvider>
                </Col>
            </Row>
        </PublicPageLayoutWrapper>
    );
};
