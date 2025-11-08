'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/lib/api';
import {
  Table,
  Card,
  Tag,
  Space,
  Button,
  Typography,
  Spin,
  Popconfirm,
  Tooltip,
  Row,
  Col,
  Statistic,
  Empty,
  message,
  Modal,
  Descriptions,
  Tabs,
} from 'antd';
import {
  BankOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  MailOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const { Title, Text } = Typography;

interface UniversityRequest {
  id: string;
  universityName: string;
  country: string;
  studentEmail: string;
  domain: string;
  status: string;
  createdAt: string;
}

export default function UniversityRequestsPage() {
  const [requests, setRequests] = useState<UniversityRequest[]>([]);
  const [allRequests, setAllRequests] = useState<UniversityRequest[]>([]); // Store all requests for stats
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<UniversityRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadAllRequests(); // Load all requests for stats
    loadRequests(); // Load filtered requests
  }, []);

  useEffect(() => {
    loadRequests(); // Reload when filter changes
  }, [statusFilter]);

  const loadAllRequests = async () => {
    try {
      const response = await api.get('/admin/university-requests');
      const data = response.data?.data || response.data;
      setAllRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load all requests:', error);
    }
  };

  const loadRequests = async () => {
    setLoading(true);
    try {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const response = await api.get(`/admin/university-requests${params}`);
      const data = response.data?.data || response.data;
      setRequests(Array.isArray(data) ? data : []);
      // Update all requests if loading all
      if (statusFilter === 'all') {
        setAllRequests(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to load university requests:', error);
      toast.error('Failed to load university requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      await api.post(`/admin/university-requests/${id}/approve`);
      toast.success('University request approved and university created. The requester has been notified via email.');
      loadAllRequests(); // Reload all for stats
      loadRequests(); // Reload filtered list
      setShowDetailModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      await api.post(`/admin/university-requests/${id}/reject`);
      toast.success('University request rejected');
      loadAllRequests(); // Reload all for stats
      loadRequests(); // Reload filtered list
      setShowDetailModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleViewDetails = (request: UniversityRequest) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
  };

  const columns: ColumnsType<UniversityRequest> = [
    {
      title: 'University Name',
      key: 'universityName',
      width: 250,
      render: (_, record) => (
        <Space>
          <BankOutlined style={{ color: '#2358d6', fontSize: '20px' }} />
          <div>
            <div className="font-medium text-gray-900">{record.universityName}</div>
            <Text type="secondary" className="text-xs flex items-center">
              <GlobalOutlined className="mr-1" />
              {record.domain}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Country',
      dataIndex: 'country',
      key: 'country',
      render: (country) => (
        <Tag color="blue" icon={<GlobalOutlined />}>
          {country}
        </Tag>
      ),
    },
    {
      title: 'Student Email',
      dataIndex: 'studentEmail',
      key: 'studentEmail',
      render: (email) => (
        <Space>
          <MailOutlined />
          <Text>{email}</Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusConfig: Record<string, { color: string; icon: any; text: string }> = {
          pending: { color: 'warning', icon: <ClockCircleOutlined />, text: 'Pending' },
          approved: { color: 'success', icon: <CheckCircleOutlined />, text: 'Approved' },
          rejected: { color: 'error', icon: <CloseCircleOutlined />, text: 'Rejected' },
        };
        const config = statusConfig[status] || statusConfig.pending;
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: 'Requested',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => format(new Date(date), 'MMM dd, yyyy HH:mm'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space>
          <Tooltip title="View details">
            <Button
              icon={<EyeOutlined />}
              onClick={() => handleViewDetails(record)}
              size="small"
            >
              View
            </Button>
          </Tooltip>
          {record.status === 'pending' && (
            <>
              <Popconfirm
                title="Approve this university request?"
                description="This will create the university and allow students from this domain to register."
                onConfirm={() => handleApprove(record.id)}
                okText="Approve"
                cancelText="Cancel"
                okButtonProps={{ danger: false }}
              >
                <Tooltip title="Approve and create university">
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    size="small"
                    loading={processingId === record.id}
                  >
                    Approve
                  </Button>
                </Tooltip>
              </Popconfirm>
              <Popconfirm
                title="Reject this university request?"
                description="This will mark the request as rejected."
                onConfirm={() => handleReject(record.id)}
                okText="Reject"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
              >
                <Tooltip title="Reject request">
                  <Button
                    danger
                    icon={<CloseCircleOutlined />}
                    size="small"
                    loading={processingId === record.id}
                  >
                    Reject
                  </Button>
                </Tooltip>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  const pendingCount = allRequests.filter((r) => r.status === 'pending').length;
  const approvedCount = allRequests.filter((r) => r.status === 'approved').length;
  const rejectedCount = allRequests.filter((r) => r.status === 'rejected').length;

  const stats = [
    {
      title: 'Total Requests',
      value: allRequests.length,
      icon: <BankOutlined />,
      color: '#2358d6',
    },
    {
      title: 'Pending',
      value: pendingCount,
      icon: <ClockCircleOutlined />,
      color: '#faad14',
    },
    {
      title: 'Approved',
      value: approvedCount,
      icon: <CheckCircleOutlined />,
      color: '#10b981',
    },
    {
      title: 'Rejected',
      value: rejectedCount,
      icon: <CloseCircleOutlined />,
      color: '#ef4444',
    },
  ];

  return (
    <ProtectedRoute requiredRole={['super_admin']}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <Title level={2} className="!mb-2 !text-gray-900">University Requests</Title>
            <Text type="secondary">Review and approve requests to add new universities</Text>
          </div>
          <Space>
            <Tooltip title="Refresh requests">
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  loadAllRequests();
                  loadRequests();
                }}
                loading={loading}
                size="large"
              >
                Refresh
              </Button>
            </Tooltip>
          </Space>
        </div>

        {/* Stats Cards */}
        <Row gutter={[16, 16]}>
          {stats.map((stat, index) => (
            <Col xs={24} sm={12} lg={6} key={index}>
              <Card className="shadow-md border-0 hover:shadow-lg transition-all duration-300" styles={{ body: { padding: '24px' } }}>
                <Statistic
                  title={<Text className="text-gray-600 font-medium">{stat.title}</Text>}
                  value={stat.value}
                  prefix={stat.icon}
                  valueStyle={{ fontSize: '24px', fontWeight: 600, color: stat.color }}
                />
              </Card>
            </Col>
          ))}
        </Row>

        {/* Status Filter Tabs */}
        <Card className="shadow-sm border-0">
          <Tabs
            activeKey={statusFilter}
            onChange={setStatusFilter}
            items={[
              {
                key: 'all',
                label: (
                  <span>
                    All Requests <Tag color="blue">{allRequests.length}</Tag>
                  </span>
                ),
              },
              {
                key: 'pending',
                label: (
                  <span>
                    Pending <Tag color="warning">{pendingCount}</Tag>
                  </span>
                ),
              },
              {
                key: 'approved',
                label: (
                  <span>
                    Approved <Tag color="success">{approvedCount}</Tag>
                  </span>
                ),
              },
              {
                key: 'rejected',
                label: (
                  <span>
                    Rejected <Tag color="error">{rejectedCount}</Tag>
                  </span>
                ),
              },
            ]}
          />
        </Card>

        {/* Requests Table */}
        <Card className="shadow-md border-0">
          <Table
            columns={columns}
            dataSource={requests}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
            }}
            scroll={{ x: 1000 }}
            locale={{
              emptyText: (
                <Empty
                  image={<BankOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
                  description={`No ${statusFilter === 'all' ? '' : statusFilter} university requests found`}
                />
              ),
            }}
          />
        </Card>

        {/* Detail Modal */}
        <Modal
          title={
            <div className="flex items-center space-x-2">
              <BankOutlined className="text-blue-500" />
              <span>University Request Details</span>
            </div>
          }
          open={showDetailModal}
          onCancel={() => {
            setShowDetailModal(false);
            setSelectedRequest(null);
          }}
          footer={null}
          width={600}
        >
          {selectedRequest && (
            <div className="space-y-4">
              <Descriptions column={1} bordered>
                <Descriptions.Item label="University Name">
                  <Text strong>{selectedRequest.universityName}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Country">
                  <Tag color="blue">{selectedRequest.country}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Email Domain">
                  <Text code>{selectedRequest.domain}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Student Email">
                  <Text>{selectedRequest.studentEmail}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag
                    color={
                      selectedRequest.status === 'pending'
                        ? 'warning'
                        : selectedRequest.status === 'approved'
                        ? 'success'
                        : 'error'
                    }
                  >
                    {selectedRequest.status.toUpperCase()}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Requested At">
                  {format(new Date(selectedRequest.createdAt), 'MMM dd, yyyy HH:mm')}
                </Descriptions.Item>
              </Descriptions>

              {selectedRequest.status === 'pending' && (
                <div className="flex justify-end space-x-2 mt-4">
                  <Popconfirm
                    title="Reject this request?"
                    onConfirm={() => handleReject(selectedRequest.id)}
                    okButtonProps={{ danger: true }}
                  >
                    <Button danger icon={<CloseCircleOutlined />}>
                      Reject
                    </Button>
                  </Popconfirm>
                  <Popconfirm
                    title="Approve and create university?"
                    description="This will create the university and allow students to register."
                    onConfirm={() => handleApprove(selectedRequest.id)}
                  >
                    <Button type="primary" icon={<CheckCircleOutlined />}>
                      Approve & Create
                    </Button>
                  </Popconfirm>
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    </ProtectedRoute>
  );
}

