import React from 'react';
import { Modal } from 'antd';
import { useDebouncedCallback } from 'use-debounce';

import Title from 'antd/es/typography/Title';

import EditableTableProps from '../../types/editabletable';
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

            <Modal
                title={<Title level={2}>{handleDeleteModalTitle}</Title>}
                open={isDeleteModalVisible}
                onOk={handleOnDelete}
                onCancel={handleDeleteModalCancel}
                cancelText="ABBRECHEN"
                closable={false}
                centered
            >
                <p>{handleDeleteModalText}</p>
            </Modal>
        </>
    );
};

export default EditableTable;
