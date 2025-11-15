import { tenantAdminEndpoint } from '../../appConfig';
import { HalResponse, ResponseList } from '../../types/ResponseList';
import { TenantAdminData } from '../../types/TenantAdminData';
import removeEmbedded from '../../utils/removeEmbedded';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

interface SearchTenantsProps {
    search?: string;
    perPage?: number;
    page?: number;
    sort?: string;
    dir?: string;
}

export const searchTenantData = ({
    page = 1,
    search = '',
    perPage = 10,
    sort = 'NAME',
    dir = 'ASC',
}: SearchTenantsProps) => {
    return fetchData({
        url: `${tenantAdminEndpoint}/search?page=${page}&perPage=${perPage}&query=${search}&field=${sort}&order=${dir}`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    }).then((v: HalResponse<TenantAdminData>) => removeEmbedded(v) as ResponseList<TenantAdminData>);
};
