export interface UserData {
    lastname: string;
    firstname: string;
    email: string;
    active: boolean;
    gender: string;
    id: number | null;
    phone: string;
    agency?: string;
    username: string;
    tenantId: number | null;
    twoFactorAuth: {
        isActive: boolean;
        qrCode: string;
        secret: string;
        type: string | null;
    };
}
