import { useTranslation } from 'react-i18next';
import { Text } from '../../../components/text/Text';
import { ReactComponent as DownloadIcon } from '../../../resources/img/svg/download.svg';

export const AuthenticatorTools = () => {
    const { t } = useTranslation();
    const tools = [
        {
            title: t('twoFactorAuth.activate.app.step2.tool1'),
            urlGoogle: t('twoFactorAuth.activate.app.step2.tool1.url.google'),
            urlApple: t('twoFactorAuth.activate.app.step2.tool1.url.apple'),
        },
        {
            title: t('twoFactorAuth.activate.app.step2.tool2'),
            urlGoogle: t('twoFactorAuth.activate.app.step2.tool2.url.google'),
            urlApple: t('twoFactorAuth.activate.app.step2.tool2.url.apple'),
        },
    ];
    return (
        <div className="twoFactorAuth__tools">
            {tools.map((tool) => {
                return (
                    <div className="twoFactorAuth__tool" key={tool.title}>
                        <Text text={tool.title} type="standard" />
                        <a target="_blank" rel="noreferrer" href={tool.urlGoogle}>
                            <DownloadIcon />
                            <Text text={t('twoFactorAuth.activate.app.step2.download.google')} type="standard" />
                        </a>
                        <a target="_blank" rel="noreferrer" href={tool.urlApple}>
                            <DownloadIcon />
                            <Text text={t('twoFactorAuth.activate.app.step2.download.apple')} type="standard" />
                        </a>
                    </div>
                );
            })}
        </div>
    );
};
