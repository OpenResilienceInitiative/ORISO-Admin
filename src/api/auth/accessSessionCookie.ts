export const setValueInCookie = (name: string, value: string) => {
    console.log('🔍 setValueInCookie: name:', name);
    console.log('🔍 setValueInCookie: value length:', value.length);
    console.log('🔍 setValueInCookie: value start:', `${value.substring(0, 50)}...`);
    // Set cookie with proper attributes for localhost development
    document.cookie = `${name}=${value};path=/;SameSite=Lax`;
};

export const deleteCookieByName = (name: string) => {
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
};

export const getValueFromCookie = (targetValue: string) => {
    const targetName = `${targetValue}=`;
    const decodedCookie = decodeURIComponent(document.cookie);

    // Debug: Show all cookies
    console.log('🔍 getValueFromCookie: All cookies:', document.cookie);
    console.log('🔍 getValueFromCookie: Looking for:', targetValue);

    const ca = decodedCookie.split(';');

    for (let i = 0; i < ca.length; i += 1) {
        let c = ca[i];
        while (c.charAt(0) === ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(targetName) === 0) {
            const value = c.substring(targetName.length, c.length);
            console.log('🔍 getValueFromCookie: targetValue:', targetValue);
            console.log('🔍 getValueFromCookie: value length:', value.length);
            console.log('🔍 getValueFromCookie: value start:', `${value.substring(0, 50)}...`);
            return value;
        }
    }
    console.log('🔍 getValueFromCookie: No cookie found for:', targetValue);
    return '';
};

export const removeAllCookies = () => {
    console.log('🔍 removeAllCookies: CALLED - Clearing all cookies');
    console.log('🔍 removeAllCookies: Current cookies:', document.cookie);
    document.cookie.split(';').forEach((c) => {
        const name = c.trim().split('=')[0];
        if ((import.meta.env.VITE_COOKIES_ALLOWEDLIST ?? '').split(',').includes(name)) {
            console.log('🔍 removeAllCookies: Preserving cookie:', name);
            return;
        }

        console.log('🔍 removeAllCookies: Removing cookie:', name);
        document.cookie = `${name}=;path=/; expires=Thu, 27 May 1992 08:32:00 MET;`;
    });
    console.log('🔍 removeAllCookies: COMPLETED');
};
