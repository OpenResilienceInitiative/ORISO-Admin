import { Card } from '../../../components/Card';
import { LanguageSelector } from '../../../components/LanguageSelector';
import { TilePicture } from '../../../components/TileFill';
import translationPicture from '../../../resources/img/tile-help/translation.webp';
import { ReactComponent as LanguageIcon } from '../../../resources/img/svg/nav-glyphs/display_settings.svg';

export const LanguageSettings = () => {
    return (
        <Card
            titleKey="language.title"
            subTitleKey="language.subtitle"
            headerIcon={<LanguageIcon />}
            picture={<TilePicture src={translationPicture} />}
        >
            <LanguageSelector variant="profile" ariaLabelKey="language.profileSelectAriaLabel" />
        </Card>
    );
};
