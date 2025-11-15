export interface LoginData {
    data: {
        authToken?: string;
        userId?: string;
    };
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
    refresh_expires_in?: number;
}
