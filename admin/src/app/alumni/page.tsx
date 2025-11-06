'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/lib/api';
import {
  Table,
  Card,
  Tag,
  Space,
  Avatar,
  Typography,
  Spin,
  Popconfirm,
  Tooltip,
  Button,
  Modal,
  Row,
  Col,
  Statistic,
  Empty,
  Image,
  Divider,
} from 'antd';
import {
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
  ReloadOutlined,
  MailOutlined,
  BankOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const { Title, Text } = Typography;

interface AlumniRequest {
  id: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    university: {
      name: string;
    } | null;
  };
  documents: any;
}

export default function AlumniPage() {
  const [requests, setRequests] = useState<AlumniRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<AlumniRequest | null>(null);
  const [showDocuments, setShowDocuments] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/alumni-requests');
      const data = response.data?.data || response.data;
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load requests:', error);
      toast.error('Failed to load alumni requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.post(`/admin/alumni-requests/${id}/approve`);
      toast.success('Alumni request approved successfully');
      loadRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve request');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.post(`/admin/alumni-requests/${id}/reject`);
      toast.success('Alumni request rejected');
      loadRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject request');
    }
  };

  const viewDocuments = (request: AlumniRequest) => {
    setSelectedRequest(request);
    setShowDocuments(true);
  };

  const getStatusTag = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      approved: { color: 'success', icon: <CheckCircleOutlined /> },
      rejected: { color: 'error', icon: <CloseCircleOutlined /> },
      pending: { color: 'warning', icon: <ClockCircleOutlined /> },
    };
    const config = statusConfig[status] || { color: 'default', icon: null };
    return (
      <Tag color={config.color} icon={config.icon} className="capitalize">
        {status}
      </Tag>
    );
  };

  const columns: ColumnsType<AlumniRequest> = [
    {
      title: 'User',
      key: 'user',
      width: 280,
      render: (_, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#2358d6' }} />
          <div>
            <div className="font-medium text-gray-900">
              {record.user.name || 'No name'}
            </div>
            <Text type="secondary" className="text-xs flex items-center">
              <MailOutlined className="mr-1" />
              {record.user.email}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'University',
      key: 'university',
      render: (_, record) => (
        <Space>
          <BankOutlined className="text-gray-400" />
          <Text>{record.user.university?.name || 'N/A'}</Text>
        </Space>
      ),
    },
    {
      title: 'Submitted',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => (
        <Space>
          <CalendarOutlined className="text-gray-400" />
          <Text>{format(new Date(date), 'MMM dd, yyyy HH:mm')}</Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space>
          <Tooltip title="View documents">
            <Button
              type="default"
              icon={<EyeOutlined />}
              onClick={() => viewDocuments(record)}
              size="small"
            >
              View
            </Button>
          </Tooltip>
          {record.status === 'pending' && (
            <>
              <Popconfirm
                title="Approve this alumni request?"
                description="This will verify the user as an alumni."
                onConfirm={() => handleApprove(record.id)}
                okText="Yes, Approve"
                cancelText="Cancel"
                okButtonProps={{ danger: false }}
              >
                <Tooltip title="Approve request">
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    size="small"
                  >
                    Approve
                  </Button>
                </Tooltip>
              </Popconfirm>
              <Popconfirm
                title="Reject this alumni request?"
                description="This action cannot be undone."
                onConfirm={() => handleReject(record.id)}
                okText="Yes, Reject"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
              >
                <Tooltip title="Reject request">
                  <Button
                    danger
                    icon={<CloseCircleOutlined />}
                    size="small"
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

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length;

  const stats = [
    {
      title: 'Pending Requests',
      value: pendingCount,
      icon: <ClockCircleOutlined />,
      color: '#f59e0b',
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
    {
      title: 'Total Requests',
      value: requests.length,
      icon: <FileTextOutlined />,
      color: '#2358d6',
    },
  ];

  return (
    <ProtectedRoute requiredRole={['super_admin', 'admin']}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <Title level={2} className="!mb-2 !text-gray-900">Alumni Approval Requests</Title>
            <Text type="secondary">Review and manage alumni verification requests</Text>
          </div>
          <Tooltip title="Refresh requests">
            <Button
              icon={<ReloadOutlined />}
              onClick={loadRequests}
              loading={loading}
              size="large"
            >
              Refresh
            </Button>
          </Tooltip>
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
              showTotal: (total) => `Total ${total} request${total !== 1 ? 's' : ''}`,
            }}
            locale={{
              emptyText: (
                <Empty
                  image={<FileTextOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
                  description="No alumni requests found"
                />
              ),
            }}
            scroll={{ x: 1000 }}
          />
        </Card>

        {/* Documents Modal */}
        <Modal
          title={
            <div className="flex items-center space-x-2">
              <FileTextOutlined className="text-blue-500" />
              <span>Alumni Documents</span>
            </div>
          }
          open={showDocuments}
          onCancel={() => setShowDocuments(false)}
          footer={[
            <Button key="close" onClick={() => setShowDocuments(false)}>
              Close
            </Button>,
            selectedRequest?.status === 'pending' && (
              <Popconfirm
                key="approve"
                title="Approve this request?"
                onConfirm={() => {
                  if (selectedRequest) {
                    handleApprove(selectedRequest.id);
                    setShowDocuments(false);
                  }
                }}
                okText="Yes"
                cancelText="No"
              >
                <Button type="primary" icon={<CheckCircleOutlined />}>
                  Approve
                </Button>
              </Popconfirm>
            ),
            selectedRequest?.status === 'pending' && (
              <Popconfirm
                key="reject"
                title="Reject this request?"
                onConfirm={() => {
                  if (selectedRequest) {
                    handleReject(selectedRequest.id);
                    setShowDocuments(false);
                  }
                }}
                okText="Yes"
                cancelText="No"
                okButtonProps={{ danger: true }}
              >
                <Button danger icon={<CloseCircleOutlined />}>
                  Reject
                </Button>
              </Popconfirm>
            ),
          ].filter(Boolean)}
          width={800}
        >
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <Space direction="vertical" size="small" className="w-full">
                  <div className="flex items-center space-x-2">
                    <UserOutlined className="text-gray-400" />
                    <Text strong>{selectedRequest.user.name || 'No name'}</Text>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MailOutlined className="text-gray-400" />
                    <Text type="secondary">{selectedRequest.user.email}</Text>
                  </div>
                  <div className="flex items-center space-x-2">
                    <BankOutlined className="text-gray-400" />
                    <Text type="secondary">
                      {selectedRequest.user.university?.name || 'N/A'}
                    </Text>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CalendarOutlined className="text-gray-400" />
                    <Text type="secondary">
                      Submitted: {format(new Date(selectedRequest.createdAt), 'MMM dd, yyyy HH:mm')}
                    </Text>
                  </div>
                </Space>
              </div>

              <Divider />

              <div>
                <Title level={5}>Uploaded Documents</Title>
                {selectedRequest.documents && typeof selectedRequest.documents === 'object' ? (
                  <div className="space-y-3 mt-4">
                    {Object.entries(selectedRequest.documents).map(([key, value]: [string, any]) => (
                      <Card key={key} size="small" className="mb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <Text strong className="block mb-2 capitalize">
                              {key.replace(/_/g, ' ')}
                            </Text>
                            {typeof value === 'string' && (
                              <div className="flex items-center space-x-2">
                                {value.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                  <Image
                                    src={value}
                                    alt={key}
                                    width={200}
                                    className="rounded"
                                    preview
                                  />
                                ) : (
                                  <Button
                                    type="link"
                                    icon={<EyeOutlined />}
                                    href={value}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    View Document
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Empty description="No documents available" />
                )}
              </div>
            </div>
          )}
        </Modal>
      </div>
    </ProtectedRoute>
  );
}

