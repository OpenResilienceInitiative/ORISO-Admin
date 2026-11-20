import { useEffect, useMemo, useRef, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { useTranslation } from 'react-i18next';
import { M3Select } from '../../components/M3Select';
import { searchTenantData } from '../../api/tenant/searchTenantData';
import { searchInviteAgencies } from '../../api/agency/searchInviteAgencies';
import decodeHTML from '../../utils/decodeHTML';

export interface SelectOption {
    id: number;
    name: string;
}

interface RemoteSearchSelectProps {
    id?: string;
    ariaLabel: string;
    placeholder?: string;
    value?: number | null;
    /** Keeps the chosen entry labelled even when the current search no longer returns it. */
    selectedOption?: SelectOption | null;
    onChange: (option: SelectOption | null) => void;
    search: (query: string) => Promise<SelectOption[]>;
    allowClear?: boolean;
    className?: string;
    excludeIds?: number[];
}

const RemoteSearchSelect = ({
    id,
    ariaLabel,
    placeholder,
    value,
    selectedOption,
    onChange,
    search,
    allowClear,
    className,
    excludeIds,
}: RemoteSearchSelectProps) => {
    const { t } = useTranslation();
    const [options, setOptions] = useState<SelectOption[]>([]);
    const [loading, setLoading] = useState(false);
    const latest = useRef(0);

    const run = (query: string) => {
        latest.current += 1;
        const ticket = latest.current;
        setLoading(true);
        search(query)
            .then((result) => {
                if (ticket === latest.current) {
                    setOptions(result);
                }
            })
            .catch(() => {
                if (ticket === latest.current) {
                    setOptions([]);
                }
            })
            .finally(() => {
                if (ticket === latest.current) {
                    setLoading(false);
                }
            });
    };
    const debouncedRun = useDebouncedCallback(run, 300);

    useEffect(() => {
        run('');
    }, [search]);

    const visible = useMemo(() => {
        const allowed = options.filter((option) => !excludeIds?.includes(option.id) || option.id === value);
        if (selectedOption && !allowed.some((option) => option.id === selectedOption.id)) {
            return [selectedOption, ...allowed];
        }
        return allowed;
    }, [options, excludeIds, value, selectedOption]);

    return (
        <M3Select
            id={id}
            aria-label={ariaLabel}
            className={className}
            showSearch
            allowClear={allowClear}
            placeholder={placeholder}
            filterOption={false}
            loading={loading}
            value={value ?? undefined}
            notFoundContent={loading ? t('addons.select.loading') : t('addons.select.empty')}
            onSearch={debouncedRun}
            onChange={(selected: number | undefined) => {
                const option = visible.find((candidate) => candidate.id === selected);
                onChange(option ?? null);
            }}
            options={visible.map((option) => ({ value: option.id, label: `${option.name} (${option.id})` }))}
        />
    );
};

const searchTenants = async (query: string): Promise<SelectOption[]> => {
    const response = await searchTenantData({ search: query, perPage: 20 });
    return (response.data ?? [])
        .filter((tenant) => tenant.id != null && Number(tenant.id) > 0)
        .map((tenant) => ({ id: Number(tenant.id), name: decodeHTML(tenant.name || '') || `#${tenant.id}` }));
};

type TenantSelectProps = Omit<RemoteSearchSelectProps, 'search'>;

export const TenantSelect = (props: TenantSelectProps) => <RemoteSearchSelect {...props} search={searchTenants} />;

type AgencySelectProps = Omit<RemoteSearchSelectProps, 'search'> & { tenantId: number };

export const AgencySelect = ({ tenantId, ...props }: AgencySelectProps) => {
    const search = useMemo(
        () => async (query: string) => {
            const page = await searchInviteAgencies(query, tenantId);
            return page.hits.map((hit) => ({ id: hit.id, name: hit.name || `#${hit.id}` }));
        },
        [tenantId],
    );
    return <RemoteSearchSelect {...props} search={search} />;
};
