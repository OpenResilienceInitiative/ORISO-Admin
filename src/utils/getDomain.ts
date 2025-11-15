export const getDomain = (subdomain?: string) => {
    const fullDomain = window.location.host;
    const lastDot = fullDomain.lastIndexOf('.');
    const firstDot = fullDomain.indexOf('.');
    const substringStart = firstDot !== lastDot ? firstDot + 1 : 0;
    const includeSubdomain = subdomain ? `${subdomain}.` : '';

    return `${includeSubdomain}${fullDomain.substring(substringStart)}`;
};
