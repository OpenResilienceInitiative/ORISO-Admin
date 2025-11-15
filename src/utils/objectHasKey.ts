/**
 * simplified wrapper for hasOwnProperty check
 * @param object {Object}
 * @param key {string}
 */
const objectHasKey = (object: any, key: string) => {
    if (!object) {
        return false;
    }

    return Object.prototype.hasOwnProperty.call(object, key);
};

export default objectHasKey;
