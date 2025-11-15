import { Dispatch, SetStateAction } from 'react';
import { CounselorData } from './counselor';
import { BasicTenantData } from './tenant';
import { BasicTopicData } from './topic';
import { AgencyData } from './agency';

export type EditableData = CounselorData | BasicTenantData | BasicTopicData | AgencyData | undefined;

export default interface EditableTableProps {
    handleBtnAdd: (formData: any) => void;
    isLoading: boolean;
    source: any[];
    columns: any[];
    isDeleteModalVisible: boolean;
    handleOnDelete: (formData: any) => void;
    handleDeleteModalCancel: (formData: any) => void;
    handleDeleteModalTitle: string;
    handleDeleteModalText: string;
    handlePagination: Dispatch<SetStateAction<number>>;
    page: number;
    allowedNumberOfUsers: number | false;
    hasSearch?: boolean;
    handleOnSearch?: (query: string) => void;
    handleOnSearchClear?: () => void;
}
