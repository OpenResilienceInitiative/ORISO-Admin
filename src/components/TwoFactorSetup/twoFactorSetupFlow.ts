/**
 * Shared 2FA setup flow contract (TEN-INV, ORISO-Admin#569).
 *
 * This module is a 1:1 port of the app layer's flow contract
 * (`ORISO-Frontend/src/components/twoFactorAuth/twoFactorSetupFlow.ts` +
 * `twoFactorAuthConstants.ts`) so both layers share the same step vocabulary,
 * step ordering and OTP rules. Keep the two files in sync — when one side
 * changes the contract, mirror it on the other side (see the shared-package
 * extraction notes in `TwoFactorSetup.tsx`).
 *
 * Differences to the Frontend original (intentional, wire-compatible):
 *  - the method type reuses the Admin `TwoFactorType` enum — its values
 *    ('APP' | 'EMAIL' | '') are identical to the Frontend `TWO_FACTOR_TYPES`.
 */

import { TwoFactorType } from '../../enums/TwoFactorType';

export const OTP_LENGTH = 6;

export type TwoFactorSetupMethod = TwoFactorType.App | TwoFactorType.Email;

export type TwoFactorSetupStep =
    | 'decision'
    | 'app-install'
    | 'app-connect'
    | 'app-verify'
    | 'app-success'
    | 'email-select'
    | 'email-connect'
    | 'email-success';

export interface TwoFactorSetupStepDefinition {
    key: TwoFactorSetupStep;
    icon: 'decision' | 'install' | 'select' | 'connect' | 'verify' | 'confirm';
    labelKey: string;
}

export const APP_SETUP_STEPS: TwoFactorSetupStepDefinition[] = [
    {
        key: 'decision',
        icon: 'decision',
        labelKey: 'twoFactorAuth.setupDialog.step.decide',
    },
    {
        key: 'app-install',
        icon: 'install',
        labelKey: 'twoFactorAuth.setupDialog.step.install',
    },
    {
        key: 'app-connect',
        icon: 'connect',
        labelKey: 'twoFactorAuth.setupDialog.step.connect',
    },
    {
        key: 'app-verify',
        icon: 'verify',
        labelKey: 'twoFactorAuth.setupDialog.step.verify',
    },
    {
        key: 'app-success',
        icon: 'confirm',
        labelKey: 'twoFactorAuth.setupDialog.step.confirm',
    },
];

export const EMAIL_SETUP_STEPS: TwoFactorSetupStepDefinition[] = [
    {
        key: 'decision',
        icon: 'decision',
        labelKey: 'twoFactorAuth.setupDialog.step.decide',
    },
    {
        key: 'email-select',
        icon: 'select',
        labelKey: 'twoFactorAuth.setupDialog.step.select',
    },
    {
        key: 'email-connect',
        icon: 'connect',
        labelKey: 'twoFactorAuth.setupDialog.step.connect',
    },
    {
        key: 'email-success',
        icon: 'confirm',
        labelKey: 'twoFactorAuth.setupDialog.step.confirm',
    },
];

const FLOW_ORDER: TwoFactorSetupStep[] = [
    'decision',
    'app-install',
    'app-connect',
    'app-verify',
    'app-success',
    'email-select',
    'email-connect',
    'email-success',
];

export const getStepMethod = (step: TwoFactorSetupStep, selectedMethod?: TwoFactorType): TwoFactorSetupMethod => {
    if (step.startsWith('email')) {
        return TwoFactorType.Email;
    }
    if (step.startsWith('app')) {
        return TwoFactorType.App;
    }
    return selectedMethod === TwoFactorType.Email ? TwoFactorType.Email : TwoFactorType.App;
};

export const getSetupSteps = (
    step: TwoFactorSetupStep,
    selectedMethod?: TwoFactorType,
): TwoFactorSetupStepDefinition[] =>
    getStepMethod(step, selectedMethod) === TwoFactorType.Email ? EMAIL_SETUP_STEPS : APP_SETUP_STEPS;

export const getStepIndex = (step: TwoFactorSetupStep, selectedMethod?: TwoFactorType): number => {
    const steps = getSetupSteps(step, selectedMethod);
    const index = steps.findIndex((item) => item.key === step);

    return index === -1 ? 0 : index;
};

export const getNextSetupStep = (step: TwoFactorSetupStep, method: TwoFactorSetupMethod): TwoFactorSetupStep => {
    if (step === 'decision') {
        return method === TwoFactorType.Email ? 'email-select' : 'app-install';
    }

    const steps = getSetupSteps(step, method);
    const nextStep = steps[getStepIndex(step, method) + 1];

    return nextStep?.key ?? step;
};

export const getPreviousSetupStep = (step: TwoFactorSetupStep): TwoFactorSetupStep => {
    if (step === 'decision') {
        return step;
    }

    const method = getStepMethod(step);
    const previousStep = getSetupSteps(step, method)[getStepIndex(step, method) - 1];

    return previousStep?.key ?? 'decision';
};

export const normalizeOtp = (value: string): string => value.replace(/\D/g, '').slice(0, OTP_LENGTH);

export const isOtpValid = (value: string): boolean => new RegExp(`^\\d{${OTP_LENGTH}}$`).test(value);

export const hasSetupStep = (step: string): step is TwoFactorSetupStep =>
    FLOW_ORDER.includes(step as TwoFactorSetupStep);
