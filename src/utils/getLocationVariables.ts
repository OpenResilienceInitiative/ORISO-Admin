const getLocationVariables = () => {
    const { location } = window;
    const { host, protocol, origin } = location;
    const parts = host.split('.');
    let subdomain = '';

    console.log('🔍 getLocationVariables: host:', host);
    console.log('🔍 getLocationVariables: parts:', parts);

    // Handle localhost:port case - use 'localhost' as subdomain
    if (host.includes('localhost')) {
        subdomain = 'localhost';
        console.log('🔍 getLocationVariables: Using localhost as subdomain');
    }
    // If we get more than 3 parts, then we have a subdomain (but not on localhost)
    // INFO: This could be 4, if you have a co.uk TLD or something like that.
    else if (parts?.length >= 3 || parts[1]?.includes('localhost')) {
        // eslint-disable-next-line prefer-destructuring
        subdomain = parts[0];
        console.log('🔍 getLocationVariables: Using first part as subdomain:', subdomain);
    }

    console.log('🔍 getLocationVariables: Final subdomain:', subdomain);
    return { subdomain, host, protocol, origin };
};

export default getLocationVariables;
