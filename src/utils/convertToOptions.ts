import { Option } from '../components/SelectFormField';

const getValue = (data, key) => {
    const nestedKeys = typeof key === 'string' && key.split('.');

    if (nestedKeys.length > 0) {
        let value = data;
        nestedKeys.forEach((nestedKey) => {
            value = value[nestedKey];
        });
        return value;
    }
    return data[key];
};

export const convertToOptions = <T>(
    data: T[],
    labelKey: keyof T | Array<keyof T>,
    valueKey: keyof T,
    filterEmptyValues = false,
): Option[] => {
    const finalData = filterEmptyValues
        ? data?.filter((tmpData) => tmpData[valueKey] !== null && tmpData[valueKey] !== undefined)
        : data;

    return (
        finalData?.map((d) => {
            const label =
                labelKey instanceof Array ? labelKey.map((key) => getValue(d, key)).join(' ') : getValue(d, labelKey);

            return {
                key: getValue(d, valueKey)?.toString() ?? label,
                label,
                value: getValue(d, valueKey)?.toString() as unknown,
            } as Option;
        }) || []
    );
};
