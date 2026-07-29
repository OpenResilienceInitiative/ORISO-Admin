import { Col, Row } from 'antd';
import clsx from 'clsx';
import { ThemeProvider } from '@mui/material/styles';
import PublicPageLayoutWrapper from '../../components/Layout/PublicPageLayoutWrapper';
import { LanguageSelector } from '../../components/LanguageSelector';
import { usePublicTenantData } from '../../hooks/usePublicTenantData.hook';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import Stage from '../Login/Stage';
import styles from './PasswordResetPageLayout.module.scss';

export interface PasswordResetPageLayoutProps {
    children: React.ReactNode;
    /**
     * `login` (default): short, vertically centred form in the sign-in column,
     * as on the login page.
     *
     * `longForm`: the page hosts a tall multi-step form (tenant-admin
     * onboarding, #569/#594). It gets the wider reading column a long legal
     * text needs (`publicLongForm`, see loginForm.less), is centred in the
     * viewport on desktop and top-aligned below xl so its first field stays
     * the first thing in view. Scrolling itself is provided by
     * PublicPageLayoutWrapper for every public page.
     */
    variant?: 'login' | 'longForm';
}

export const PasswordResetPageLayout = ({ children, variant = 'login' }: PasswordResetPageLayoutProps) => {
    const { data: tenantData } = usePublicTenantData();
    const isLongForm = variant === 'longForm';

    return (
        // `publicLongForm` opts out of the 320px sign-in column cap that
        // loginForm.less applies to every public page from md up (#594.3): a
        // 60-page agreement needs a reading measure, a login form does not.
        <PublicPageLayoutWrapper className={clsx('login flex-col flex', isLongForm && 'publicLongForm')}>
            <div className="loginLanguageSelector">
                <LanguageSelector variant="login" ariaLabelKey="language.loginSelectAriaLabel" />
            </div>
            {/* The Admin panel's branding fade plays once on EVERY public page
                (#594.3). It is fixed-position and settles off-canvas below xl,
                so it never covers a long form after its intro. */}
            <Stage logo={tenantData?.theming?.logo} claim={tenantData?.content?.claim} />
            <Row align={isLongForm ? 'top' : 'middle'} style={{ flex: '1 0 auto' }}>
                <Col
                    xs={{ span: 20, offset: 2 }}
                    md={{ span: 8, offset: 2 }}
                    xl={{ span: 6, offset: 5 }}
                    className={isLongForm ? styles.longFormColumn : undefined}
                >
                    <ThemeProvider theme={orisoMuiTheme}>{children}</ThemeProvider>
                </Col>
            </Row>
        </PublicPageLayoutWrapper>
    );
};
