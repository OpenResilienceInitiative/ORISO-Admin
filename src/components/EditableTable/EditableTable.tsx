import React from 'react';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { useDebouncedCallback } from 'use-debounce';

import EditableTableProps from '../../types/editabletable';
import { Modal } from '../Modal';
import { ListingTable } from '../ListingTable';
import AddButton from './AddButton';
import { GlobalSearchBar } from '../GlobalSearch';

const EditableTable = ({
    handleBtnAdd,
    hasSearch,
    handleOnSearch,
    handleOnSearchClear,
    isLoading,
    source,
    columns,
    isDeleteModalVisible,
    handleOnDelete,
    handleDeleteModalCancel,
    handleDeleteModalTitle,
    handleDeleteModalText,
    allowedNumberOfUsers = 9999,
}: EditableTableProps) => {
    const handleSearchChange = useDebouncedCallback((value: string) => {
        if (value.length >= 3) {
            handleOnSearch?.(value);
        } else if (value.length === 0) {
            handleOnSearchClear?.();
        }
    }, 1000);

    return (
        <>
            <div className="lg-flex justify-between">
                <AddButton
                    allowedNumberOfUsers={allowedNumberOfUsers}
                    sourceLength={source.length}
                    handleBtnAdd={handleBtnAdd}
                />

                {hasSearch && (
                    <div className="tableSearch">
                        <GlobalSearchBar
                            defaultExpanded
                            onSearch={handleOnSearch}
                            onSearchChange={handleSearchChange}
                        />
                    </div>
                )}
            </div>

            <ListingTable
                loading={isLoading}
                dataSource={source}
                columns={columns}
                scroll={{ x: 'max-content', y: 'auto' }}
                sticky
                tableLayout="fixed"
            />

            {isDeleteModalVisible && (
                <Modal
                    title={handleDeleteModalTitle}
                    icon={<DeleteOutlineOutlinedIcon />}
                    closable={false}
                    cancelLabelKey="btn.cancel.uppercase"
                    okLabelKey="btn.ok.uppercase"
                    onConfirm={() => handleOnDelete()}
                    onClose={() => handleDeleteModalCancel()}
                >
                    <p>{handleDeleteModalText}</p>
                </Modal>
            )}
        </>
    );
};

export default EditableTable;
