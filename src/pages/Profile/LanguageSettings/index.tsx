import { Card } from '../../../components/Card';
import { LanguageSelector } from '../../../components/LanguageSelector';

export const LanguageSettings = () => {
    return (
        <Card titleKey="language.title" subTitleKey="language.subtitle">
            <LanguageSelector variant="profile" ariaLabelKey="language.profileSelectAriaLabel" />
        </Card>
    );
};
