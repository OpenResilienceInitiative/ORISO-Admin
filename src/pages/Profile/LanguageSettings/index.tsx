import { Card } from '../../../components/Card';
import { LanguageSelector } from '../../../components/LanguageSelector';
import { ReactComponent as LanguageIcon } from '../../../resources/img/svg/nav-glyphs/display_settings.svg';

export const LanguageSettings = () => {
    return (
        <Card titleKey="language.title" subTitleKey="language.subtitle" headerIcon={<LanguageIcon />}>
            <LanguageSelector variant="profile" ariaLabelKey="language.profileSelectAriaLabel" />
        </Card>
    );
};
