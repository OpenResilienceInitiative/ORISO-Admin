import { Button, Table, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { PlusOutlined } from '@ant-design/icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ColumnsType } from 'antd/lib/table';
import { useParams } from 'react-router';
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined';
import EditButtons from '../../../components/EditableTable/EditButtons';
import { ConsultantInterface, AgencyEditData, AgencyEventTypes } from '../../../types/agencyEdit';
import ResizableTitle from '../../../components/Resizable/Resizable';
import { InitialMeetingNewModal } from './InitialMeetingNewModal';
import { InitialMeetingEditModal } from './InitialMeetingEditModal';
import getAgencyEventTypes from '../../../api/agency/getAgencyEventTypes';
import getAgencyEventTypeById from '../../../api/agency/getAgencyEventTypeById';
import { EventTypeDeletionModal } from './EventTypeDeletionModal';
import { getAgencyConsultants } from '../../../api/agency/getAgencyConsultants';
import routePathNames from '../../../appConfig';
import { Resource } from '../../../enums/Resource';
import { Page } from '../../../components/Page';
import { useBookingLocations } from './useBookingLocations';
import { useAgencyData } from '../../../hooks/useAgencyData';
import { useAgencyLegalDataMissing } from '../../../hooks/useAgencyLegalDataMissing';

const { Paragraph } = Typography;

export const AgencyEditInitialMeeting = () => {
    const { t } = useTranslation();
    const { id: agencyId } = useParams();
    const { data: agencyData, isLoading: isLoadingAgency } = useAgencyData({ id: agencyId });
    const legalDataMissing = useAgencyLegalDataMissing(agencyData);
    const [topics, setTopics] = useState([]);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showNewModal, setShowNewModal] = useState(false);
    const [editableData, setEditableData] = useState(undefined);
    const [eventTypeDelete, setEventTypeDelete] = useState(undefined);
    const [allAgencyConsultants, setAllAgencyConsultants] = useState<ConsultantInterface[]>(undefined);
    const [isLoading, setIsLoading] = useState(true);
    const Locations = useBookingLocations();
    const [tableState] = useState<TableState>({
        current: 1,
        sortBy: undefined,
        order: undefined,
    });

    const transformData = (eventTypes: AgencyEventTypes[]) => {
        const agencyEventTypes = [];
        eventTypes.forEach((event: AgencyEventTypes) => {
            agencyEventTypes.push({
                id: event.id,
                name: event.title,
                description: event.description,
                url: `${routePathNames.appointmentServiceDevServer}/team/${event.slug}`,
                duration: event.length,
                advisor: null,
                locations: event.locations,
                isDefaultEvent: JSON.parse(event.metadata || '{}')?.defaultEventType,
            });
        });
        return agencyEventTypes;
    };

    const getAgencyData = () => {
        Promise.all([getAgencyEventTypes(agencyId), getAgencyConsultants(agencyId)]).then((resp) => {
            const agencyEventTypes = transformData(resp[0]);
            setTopics(agencyEventTypes);
            setIsLoading(false);
            setAllAgencyConsultants(resp[1]);
        });
    };

    const agencyDataConsultantsTransform = (resp: AgencyEventTypes, data: AgencyEditData) => {
        const newAdvisors = [];
        resp.consultants.map((consultant: ConsultantInterface) => {
            return newAdvisors.push({
                id: consultant.consultantId,
                name: consultant.consultantName,
            });
        });
        return { ...data, advisor: newAdvisors };
    };

    const handleEditTable = (data: AgencyEditData) => {
        getAgencyEventTypeById(agencyId, data.id).then((resp: AgencyEventTypes) => {
            const editableDataContent = agencyDataConsultantsTransform(resp, data);
            setEditableData(editableDataContent);
            setShowEditModal(true);
        });
    };

    const handleConsultantTypeNew = () => {
        setShowNewModal(true);
    };

    const handleCancelNew = () => {
        setShowNewModal(false);
    };

    const handleSaveNew = () => {
        setShowNewModal(false);
        getAgencyData();
    };

    const handleCancelEdit = () => {
        setShowEditModal(false);
    };

    const handleSaveEdit = () => {
        setShowEditModal(false);
        getAgencyData();
    };

    const handleCancelDelete = () => {
        setShowDeleteModal(false);
    };

    const handleSaveDelete = () => {
        setShowDeleteModal(false);
        setEventTypeDelete(undefined);
        getAgencyData();
    };

    const handleDeleteTable = (data: AgencyEditData) => {
        setShowDeleteModal(true);
        setEventTypeDelete(data);
    };

    function defineTableColumns(): ColumnsType<AgencyEventTypes> {
        return [
            {
                title: t('agency.edit.initialMeeting.table.appointment_label'),
                dataIndex: 'name',
                key: 'name',
                width: 350,
                ellipsis: true,
                fixed: 'left',
            },
            {
                title: t('agency.edit.initialMeeting.table.location'),
                dataIndex: 'locations',
                key: 'location',
                width: 150,
                ellipsis: true,
                render: (locations: Array<{ type: string }>) =>
                    locations.map(({ type }) => Locations.find((location) => location.value === type).label).join(', '),
            },
            {
                title: t('agency.edit.initialMeeting.table.duration'),
                dataIndex: 'duration',
                key: 'duration',
                width: 150,
                ellipsis: true,
            },
            {
                width: 88,
                title: '',
                key: 'edit',
                render: (_: any, record: AgencyEventTypes) => {
                    return (
                        <div className="tableActionWrapper">
                            <EditButtons
                                handleEdit={handleEditTable}
                                handleDelete={handleDeleteTable}
                                record={record}
                                resource={Resource.Agency}
                                disabled={{ edit: false, delete: record.isDefaultEvent }}
                            />
                        </div>
                    );
                },
                fixed: 'right',
            },
        ];
    }

    const [columnsWidth, setColumnsWidth] = useState(defineTableColumns().map(({ width }) => width));

    const handleResize = useCallback(
        (index) =>
            (_, { size }) => {
                const newColumnsWidth = [...columnsWidth];
                newColumnsWidth[index] = size.width;
                setColumnsWidth(newColumnsWidth);
            },
        [columnsWidth],
    );

    const mergeColumns = defineTableColumns().map((col, index) => ({
        ...col,
        width: columnsWidth[index],
        onHeaderCell: (column) => ({
            width: column.width,
            onResize: handleResize(index),
        }),
    }));

    useEffect(() => {
        getAgencyData();
    }, [tableState, agencyId]);

    return (
        <Page>
            <Page.BackWithActions
                path={routePathNames.agency}
                titleKey="agency.edit.initialMeeting.title"
                tabs={[
                    {
                        titleKey: 'agency.edit.tab.settings',
                        to: `${routePathNames.agency}/${agencyId}/general`,
                        icon: !isLoadingAgency && legalDataMissing ? <ErrorOutlinedIcon color="error" /> : null,
                    },
                    {
                        titleKey: 'agency.edit.tab.initialEnquiry',
                        to: `${routePathNames.agency}/${agencyId}/initial-meeting`,
                    },
                ]}
            >
                <Button className="mb-m mr-sm" type="primary" icon={<PlusOutlined />} onClick={handleConsultantTypeNew}>
                    {t('agency.edit.initialMeeting.button_label')}
                </Button>
            </Page.BackWithActions>
            <Paragraph>{t('agency.edit.initialMeeting.description')}</Paragraph>

            <Table
                loading={isLoading}
                className="agencyList editableTable"
                dataSource={topics}
                columns={mergeColumns}
                scroll={{
                    x: 'max-content',
                    y: 'auto',
                }}
                rowKey="id"
                style={{
                    width: '100%',
                }}
                components={{
                    header: {
                        cell: ResizableTitle,
                    },
                }}
            />
            <InitialMeetingNewModal
                showEditModal={showNewModal}
                handleCancel={handleCancelNew}
                handleSave={handleSaveNew}
                allAgencyConsultants={allAgencyConsultants}
            />
            <InitialMeetingEditModal
                showEditModal={showEditModal}
                handleCancel={handleCancelEdit}
                handleSave={handleSaveEdit}
                editableData={editableData}
                allAgencyConsultants={allAgencyConsultants}
            />
            <EventTypeDeletionModal
                showDeleteModal={showDeleteModal}
                handleCancel={handleCancelDelete}
                handleSave={handleSaveDelete}
                eventType={eventTypeDelete}
            />
        </Page>
    );
};
