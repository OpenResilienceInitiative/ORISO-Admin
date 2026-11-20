import { TilePicture } from '../../../TileFill';
import type { TileHelpTopic } from '../../../TileHelp';
import mailServerPicture from '../../../../resources/img/tile-help/mail-server.webp';
import smtpPlatformTestPicture from '../../../../resources/img/tile-help/smtp/platform-test.webp';
import smtpPlatformSyncPicture from '../../../../resources/img/tile-help/smtp/platform-sync.webp';
import smtpPlatformSecretPicture from '../../../../resources/img/tile-help/smtp/platform-secret.webp';
import smtpTenantOwnPicture from '../../../../resources/img/tile-help/smtp/tenant-own.webp';
import smtpTenantSwitchPicture from '../../../../resources/img/tile-help/smtp/tenant-switch.webp';

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
            visual: <TilePicture src={smtpPlatformTestPicture} />,
        },
        {
            id: 'sync',
            titleKey: 'tileHelp.platformSmtp.sync.title',
            bodyKey: 'tileHelp.platformSmtp.sync.body',
            visual: <TilePicture src={smtpPlatformSyncPicture} />,
        },
        {
            id: 'secret',
            titleKey: 'tileHelp.platformSmtp.secret.title',
            bodyKey: 'tileHelp.platformSmtp.secret.body',
            visual: <TilePicture src={smtpPlatformSecretPicture} />,
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
            visual: <TilePicture src={smtpTenantOwnPicture} />,
        },
        {
            id: 'switch',
            titleKey: 'tileHelp.tenantSmtp.switch.title',
            bodyKey: 'tileHelp.tenantSmtp.switch.body',
            visual: <TilePicture src={smtpTenantSwitchPicture} />,
        },
        {
            id: 'test',
            titleKey: 'tileHelp.tenantSmtp.test.title',
            bodyKey: 'tileHelp.tenantSmtp.test.body',
            visual: <TilePicture src={smtpPlatformTestPicture} />,
        },
    ],
};
