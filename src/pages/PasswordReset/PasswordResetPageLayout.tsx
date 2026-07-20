import { Col, Row } from 'antd';
import { ThemeProvider } from '@mui/material/styles';
import PublicPageLayoutWrapper from '../../components/Layout/PublicPageLayoutWrapper';
import { LanguageSelector } from '../../components/LanguageSelector';
import { usePublicTenantData } from '../../hooks/usePublicTenantData.hook';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import Stage from '../Login/Stage';

export const PasswordResetPageLayout = ({ children }: { children: React.ReactNode }) => {
    const { data: tenantData } = usePublicTenantData();

    return (
        <PublicPageLayoutWrapper className="login flex-col flex">
            <div className="loginLanguageSelector">
                <LanguageSelector variant="login" ariaLabelKey="language.loginSelectAriaLabel" />
            </div>
            <Stage logo={tenantData?.theming?.logo} claim={tenantData?.content?.claim} />
            <Row align="middle" style={{ flex: '1 0 auto' }}>
                <Col xs={{ span: 20, offset: 2 }} md={{ span: 8, offset: 2 }} xl={{ span: 6, offset: 5 }}>
                    <ThemeProvider theme={orisoMuiTheme}>{children}</ThemeProvider>
                </Col>
            </Row>
        </PublicPageLayoutWrapper>
    );
};
