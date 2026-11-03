import { Card } from '../../components/Card';
import { TwoFactorSetup } from '../../components/TwoFactorSetup/TwoFactorSetup';
import { ReactComponent as VerifiedIcon } from '../../resources/img/svg/verified.svg';

export const TwoFactorCard = () => (
    <Card titleKey="twoFactorAuth.title" subTitleKey="twoFactorAuth.subtitle" headerIcon={<VerifiedIcon />}>
        <TwoFactorSetup context="profile" />
    </Card>
);
