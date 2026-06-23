export type CookieAttributeConfig = {
    cookieSecure: boolean;
    cookieDomain: string;
    httpOnly?: boolean;
};

export const buildCookieAttributes = ({
    cookieSecure,
    cookieDomain,
    httpOnly = false,
}: CookieAttributeConfig): string => {
    const secure = cookieSecure ? '; Secure' : '';
    const domain = cookieDomain ? `; Domain=${cookieDomain}` : '';
    const httpOnlyFlag = httpOnly ? '; HttpOnly' : '';

    return `; path=/; SameSite=Strict${secure}${domain}${httpOnlyFlag}`;
};
