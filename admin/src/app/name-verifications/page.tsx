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
  Input,
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
  GlobalOutlined,
  IdcardOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface NameVerificationRequest {
  id: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    profileMode: string;
    university: {
      name: string;
      country?: {
        name: string;
        code: string | null;
      } | null;
    } | null;
    organization: {
      name: string;
      country?: {
        name: string;
        code: string | null;
      } | null;
    } | null;
  };
  documents: any;
}

export default function NameVerificationsPage() {
  const [requests, setRequests] = useState<NameVerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<NameVerificationRequest | null>(null);
  const [showDocuments, setShowDocuments] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/name-verifications');
      const data = response.data?.data || response.data;
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load requests:', error);
      toast.error('Failed to load name verification requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.post(`/admin/name-verifications/${id}/approve`);
      toast.success('Name verification approved successfully');
      loadRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve request');
    }
  };

  const handleReject = async (id: string, reason?: string) => {
    try {
      await api.post(`/admin/name-verifications/${id}/reject`, { reason: reason || null });
      toast.success('Name verification rejected');
      loadRequests();
      setShowRejectModal(false);
      setRejectReason('');
      setRejectingId(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject request');
    }
  };

  const openRejectModal = (id: string) => {
    setRejectingId(id);
    setShowRejectModal(true);
  };

  const handleViewDocuments = (request: NameVerificationRequest) => {
    setSelectedRequest(request);
    setShowDocuments(true);
  };

  const getDocumentImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // Proxy through backend for secure access
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  };

  const columns: ColumnsType<NameVerificationRequest> = [
    {
      title: 'User',
      key: 'user',
      render: (_, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} src={null} />
          <div>
            <div style={{ fontWeight: 500 }}>
              {record.user.name || 'No Name'}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {record.user.email}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Profile Type',
      key: 'profileMode',
      render: (_, record) => (
        <Tag color={record.user.profileMode === 'student' ? 'blue' : 'purple'}>
          {record.user.profileMode === 'student' ? 'Student' : 'Professional'}
        </Tag>
      ),
    },
    {
      title: 'Institution',
      key: 'institution',
      render: (_, record) => {
        if (record.user.university) {
          return (
            <Space>
              <GlobalOutlined />
              <div>
                <div>{record.user.university.name}</div>
                {record.user.university.country && (
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {record.user.university.country.name}
                  </div>
                )}
              </div>
            </Space>
          );
        }
        if (record.user.organization) {
          return (
            <Space>
              <BankOutlined />
              <div>
                <div>{record.user.organization.name}</div>
                {record.user.organization.country && (
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {record.user.organization.country.name}
                  </div>
                )}
              </div>
            </Space>
          );
        }
        return <Text type="secondary">-</Text>;
      },
    },
    {
      title: 'Documents',
      key: 'documents',
      render: (_, record) => {
        const docs = Array.isArray(record.documents) ? record.documents : [];
        return (
          <Space>
            <FileTextOutlined />
            <Text>{docs.length} document(s)</Text>
          </Space>
        );
      },
    },
    {
      title: 'Submitted',
      key: 'createdAt',
      render: (_, record) => (
        <Space>
          <CalendarOutlined />
          <Text>{format(new Date(record.createdAt), 'MMM dd, yyyy HH:mm')}</Text>
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="View Documents">
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => handleViewDocuments(record)}
            >
              View
            </Button>
          </Tooltip>
          <Popconfirm
            title="Approve Name Verification"
            description="Are you sure you want to approve this name verification? The user's name will be locked and cannot be changed."
            onConfirm={() => handleApprove(record.id)}
            okText="Yes, Approve"
            cancelText="Cancel"
          >
            <Button type="primary" icon={<CheckCircleOutlined />}>
              Approve
            </Button>
          </Popconfirm>
          <Button
            danger
            icon={<CloseCircleOutlined />}
            onClick={() => openRejectModal(record.id)}
          >
            Reject
          </Button>
        </Space>
      ),
    },
  ];

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <ProtectedRoute requiredRole={['admin', 'super_admin']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Title level={2} className="!mb-2 !text-gray-900">
              Name Verification Requests
            </Title>
            <Text type="secondary">
              Review and approve name verification requests from users
            </Text>
          </div>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadRequests}
            loading={loading}
          >
            Refresh
          </Button>
        </div>

        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Pending Requests"
                value={pendingCount}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Total Requests"
                value={requests.length}
                prefix={<IdcardOutlined />}
              />
            </Card>
          </Col>
        </Row>

        <Card className="shadow-sm border-0">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Spin size="large" />
            </div>
          ) : requests.length === 0 ? (
            <Empty
              description="No name verification requests found"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <Table
              columns={columns}
              dataSource={requests}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `Total ${total} requests`,
              }}
            />
          )}
        </Card>

        {/* Documents Modal */}
        <Modal
          title="Name Verification Documents"
          open={showDocuments}
          onCancel={() => {
            setShowDocuments(false);
            setSelectedRequest(null);
          }}
          footer={null}
          width={800}
        >
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <Text strong>User: </Text>
                <Text>{selectedRequest.user.name || 'No Name'}</Text>
                <br />
                <Text strong>Email: </Text>
                <Text>{selectedRequest.user.email}</Text>
                <br />
                <Text strong>Profile Type: </Text>
                <Tag color={selectedRequest.user.profileMode === 'student' ? 'blue' : 'purple'}>
                  {selectedRequest.user.profileMode === 'student' ? 'Student' : 'Professional'}
                </Tag>
              </div>
              <Divider />
              <div>
                <Text strong className="block mb-2">
                  Submitted Documents ({Array.isArray(selectedRequest.documents) ? selectedRequest.documents.length : 0})
                </Text>
                <Text type="secondary" className="text-xs block mb-4">
                  Acceptable documents: Office ID, Business Card, Certificate, NID, Passport, etc.
                </Text>
                <Row gutter={[16, 16]}>
                  {Array.isArray(selectedRequest.documents) &&
                    selectedRequest.documents.map((doc: string, index: number) => (
                      <Col xs={24} sm={12} md={8} key={index}>
                        <Card
                          hoverable
                          cover={
                            <Image
                              alt={`Document ${index + 1}`}
                              src={getDocumentImageUrl(doc)}
                              fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23f0f0f0' width='200' height='200'/%3E%3Ctext fill='%23999' font-family='sans-serif' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EDocument%3C/text%3E%3C/svg%3E"
                              style={{ height: 200, objectFit: 'cover' }}
                              preview={{
                                mask: 'View Full Size',
                              }}
                            />
                          }
                        >
                          <Card.Meta
                            title={`Document ${index + 1}`}
                            description={
                              <a
                                href={getDocumentImageUrl(doc)}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Open in new tab
                              </a>
                            }
                          />
                        </Card>
                      </Col>
                    ))}
                </Row>
              </div>
              <Divider />
              <div className="flex justify-end gap-2">
                <Button
                  danger
                  onClick={() => {
                    openRejectModal(selectedRequest.id);
                    setShowDocuments(false);
                  }}
                >
                  Reject
                </Button>
                <Popconfirm
                  title="Approve Name Verification"
                  description="Are you sure you want to approve this name verification? The user's name will be locked and cannot be changed."
                  onConfirm={() => {
                    handleApprove(selectedRequest.id);
                    setShowDocuments(false);
                  }}
                  okText="Yes, Approve"
                  cancelText="Cancel"
                >
                  <Button type="primary">Approve</Button>
                </Popconfirm>
              </div>
            </div>
          )}
        </Modal>

        {/* Reject Modal */}
        <Modal
          title="Reject Name Verification"
          open={showRejectModal}
          onOk={() => {
            if (rejectingId) {
              handleReject(rejectingId, rejectReason);
            }
          }}
          onCancel={() => {
            setShowRejectModal(false);
            setRejectReason('');
            setRejectingId(null);
          }}
          okText="Reject"
          okButtonProps={{ danger: true }}
        >
          <div className="space-y-4">
            <Text>
              Please provide a reason for rejecting this name verification request (optional):
            </Text>
            <TextArea
              rows={4}
              placeholder="e.g., Documents are unclear, name mismatch, invalid document type..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}

