export type VerificationProfile = 'strict' | 'functional-pilot';
export interface ControlCapsule {
    invocationId: string;
    phase: 'capture' | 'verify' | 'witness-positive' | 'witness-functional' | 'witness-disconnected';
    shuffle: boolean;
    profile: VerificationProfile;
    source: { revision: string; snapshot: { digest: string } };
    selection: 'controls20' | 'axe-witness1';
    witness?: {
        contractVersion: 1;
        pairId: string;
        observation: 'attached' | 'disconnected-negative';
        addon: object;
        axe: object;
    };
}
export function readVerificationProfile(env?: Record<string, string | undefined>): VerificationProfile;
export function validateControlCapsule(capsule: unknown): ControlCapsule;
export function readControlInvocation(env?: Record<string, string | undefined>): ControlCapsule | undefined;
