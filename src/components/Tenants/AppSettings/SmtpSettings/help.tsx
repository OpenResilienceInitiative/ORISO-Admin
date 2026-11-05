import { TilePicture } from '../../../TileFill';
import type { TileHelpTopic } from '../../../TileHelp';
import mailServerPicture from '../../../../resources/img/tile-help/mail-server.webp';

export const platformSmtpHelp: TileHelpTopic = {
    id: 'platformSmtp',
    titleKey: 'globalSettings.smtp.title',
    essenceKey: 'tileHelp.platformSmtp.essence',
    slides: [
        {
            id: 'switches',
            titleKey: 'tileHelp.platformSmtp.switches.title',
            bodyKey: 'tileHelp.platformSmtp.switches.body',
            visual: <TilePicture src={mailServerPicture} />,
        },
        {
            id: 'test',
            titleKey: 'tileHelp.platformSmtp.test.title',
            bodyKey: 'tileHelp.platformSmtp.test.body',
        },
        {
            id: 'sync',
            titleKey: 'tileHelp.platformSmtp.sync.title',
            bodyKey: 'tileHelp.platformSmtp.sync.body',
        },
        {
            id: 'secret',
            titleKey: 'tileHelp.platformSmtp.secret.title',
            bodyKey: 'tileHelp.platformSmtp.secret.body',
        },
    ],
};

export const tenantSmtpHelp: TileHelpTopic = {
    id: 'tenantSmtp',
    titleKey: 'tenants.appSettings.smtp.title',
    essenceKey: 'tileHelp.tenantSmtp.essence',
    slides: [
        {
            id: 'mode',
            titleKey: 'tileHelp.tenantSmtp.mode.title',
            bodyKey: 'tileHelp.tenantSmtp.mode.body',
            visual: <TilePicture src={mailServerPicture} />,
        },
        {
            id: 'own',
            titleKey: 'tileHelp.tenantSmtp.own.title',
            bodyKey: 'tileHelp.tenantSmtp.own.body',
        },
        {
            id: 'switch',
            titleKey: 'tileHelp.tenantSmtp.switch.title',
            bodyKey: 'tileHelp.tenantSmtp.switch.body',
        },
        {
            id: 'test',
            titleKey: 'tileHelp.tenantSmtp.test.title',
            bodyKey: 'tileHelp.tenantSmtp.test.body',
        },
    ],
};
