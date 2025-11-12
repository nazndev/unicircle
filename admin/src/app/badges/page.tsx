'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/lib/api';
import {
  Card,
  Table,
  Tag,
  Button,
  Typography,
  Spin,
  Space,
  Modal,
  Image,
  message,
  Tabs,
  Empty,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EyeOutlined,
  TrophyOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface Badge {
  id: string;
  badgeType: string;
  verified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
  documents?: any;
  metadata?: any;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    profileMode: string;
  };
}

const badgeTypeLabels: { [key: string]: string } = {
  teacher: 'Teacher',
  engineer: 'Engineer',
  doctor: 'Doctor',
  chartered_accountant: 'Chartered Accountant',
  lawyer: 'Lawyer',
  architect: 'Architect',
  pharmacist: 'Pharmacist',
  dentist: 'Dentist',
  veterinarian: 'Veterinarian',
  nurse: 'Nurse',
  psychologist: 'Psychologist',
  consultant: 'Consultant',
  designer: 'Designer',
  developer: 'Developer',
  analyst: 'Analyst',
};

export default function BadgesPage() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    loadBadges();
  }, [activeTab]);

  const loadBadges = async () => {
    try {
      setLoading(true);
      const status = activeTab === 'pending' ? 'pending' : activeTab === 'verified' ? 'verified' : 'all';
      const response = await api.get(`/admin/badges?status=${status}`);
      
      let data = response.data;
      if (data?.data) {
        data = data.data;
      }
      
      setBadges(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Failed to load badges:', error);
      message.error('Failed to load badges');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (badgeId: string) => {
    try {
      await api.post(`/admin/badges/${badgeId}/verify`);
      message.success('Badge verified successfully');
      loadBadges();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to verify badge');
    }
  };

  const handleReject = async (badgeId: string) => {
    Modal.confirm({
      title: 'Reject Badge',
      content: 'Are you sure you want to reject this badge request? This will remove the badge from the user.',
      okText: 'Reject',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await api.post(`/admin/badges/${badgeId}/reject`);
          message.success('Badge rejected and removed');
          loadBadges();
        } catch (error: any) {
          message.error(error.response?.data?.message || 'Failed to reject badge');
        }
      },
    });
  };

  const handleRemove = async (badgeId: string) => {
    Modal.confirm({
      title: 'Remove Badge',
      content: 'Are you sure you want to remove this badge? This action cannot be undone.',
      okText: 'Remove',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await api.delete(`/admin/badges/${badgeId}`);
          message.success('Badge removed successfully');
          loadBadges();
        } catch (error: any) {
          message.error(error.response?.data?.message || 'Failed to remove badge');
        }
      },
    });
  };

  const handleViewDocuments = (badge: Badge) => {
    setSelectedBadge(badge);
    setPreviewVisible(true);
  };

  const columns = [
    {
      title: 'User',
      key: 'user',
      render: (_: any, record: Badge) => (
        <div>
          <Text strong>{record.user.name || 'N/A'}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.user.email}
          </Text>
          <br />
          <Tag color="blue">{record.user.profileMode}</Tag>
        </div>
      ),
    },
    {
      title: 'Badge Type',
      dataIndex: 'badgeType',
      key: 'badgeType',
      render: (badgeType: string) => (
        <Tag color="purple" icon={<TrophyOutlined />}>
          {badgeTypeLabels[badgeType] || badgeType}
        </Tag>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, record: Badge) => (
        <Tag
          color={record.verified ? 'green' : 'orange'}
          icon={record.verified ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
        >
          {record.verified ? 'Verified' : 'Pending'}
        </Tag>
      ),
    },
    {
      title: 'Documents',
      key: 'documents',
      render: (_: any, record: Badge) => {
        const docs = record.documents;
        const docCount = Array.isArray(docs) ? docs.length : docs ? 1 : 0;
        return docCount > 0 ? (
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDocuments(record)}
          >
            {docCount} document{docCount > 1 ? 's' : ''}
          </Button>
        ) : (
          <Text type="secondary">No documents</Text>
        );
      },
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Badge) => (
        <Space>
          {!record.verified && (
            <>
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleVerify(record.id)}
              >
                Verify
              </Button>
              <Button
                danger
                size="small"
                icon={<CloseCircleOutlined />}
                onClick={() => handleReject(record.id)}
              >
                Reject
              </Button>
            </>
          )}
          <Button
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleRemove(record.id)}
          >
            Remove
          </Button>
        </Space>
      ),
    },
  ];

  const pendingCount = badges.filter((b) => !b.verified).length;
  const verifiedCount = badges.filter((b) => b.verified).length;

  return (
    <ProtectedRoute>
      <div className="p-6">
        <div className="mb-6">
          <Title level={2}>Badge Management</Title>
          <Text type="secondary">
            Manage user badges. Users can add badges (unverified by default), and admins can verify them.
          </Text>
        </div>

        <Card>
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane
              tab={
                <span>
                  Pending <Tag color="orange">{pendingCount}</Tag>
                </span>
              }
              key="pending"
            >
              <Table
                columns={columns}
                dataSource={badges.filter((b) => !b.verified)}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 20 }}
                locale={{
                  emptyText: <Empty description="No pending badges" />,
                }}
              />
            </TabPane>
            <TabPane
              tab={
                <span>
                  Verified <Tag color="green">{verifiedCount}</Tag>
                </span>
              }
              key="verified"
            >
              <Table
                columns={columns}
                dataSource={badges.filter((b) => b.verified)}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 20 }}
                locale={{
                  emptyText: <Empty description="No verified badges" />,
                }}
              />
            </TabPane>
            <TabPane tab="All" key="all">
              <Table
                columns={columns}
                dataSource={badges}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 20 }}
                locale={{
                  emptyText: <Empty description="No badges" />,
                }}
              />
            </TabPane>
          </Tabs>
        </Card>

        <Modal
          title="Badge Documents"
          open={previewVisible}
          onCancel={() => setPreviewVisible(false)}
          footer={null}
          width={800}
        >
          {selectedBadge && (
            <div>
              <div className="mb-4">
                <Text strong>Badge Type: </Text>
                <Tag color="purple">
                  {badgeTypeLabels[selectedBadge.badgeType] || selectedBadge.badgeType}
                </Tag>
              </div>
              <div className="mb-4">
                <Text strong>User: </Text>
                <Text>{selectedBadge.user.name} ({selectedBadge.user.email})</Text>
              </div>
              {selectedBadge.metadata && (
                <div className="mb-4">
                  <Text strong>Metadata: </Text>
                  <pre style={{ backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
                    {JSON.stringify(selectedBadge.metadata, null, 2)}
                  </pre>
                </div>
              )}
              {selectedBadge.documents && (
                <div>
                  <Text strong>Documents: </Text>
                  <div className="mt-2">
                    {Array.isArray(selectedBadge.documents) ? (
                      selectedBadge.documents.map((doc: string, index: number) => (
                        <div key={index} className="mb-2">
                          <Image
                            src={doc}
                            alt={`Document ${index + 1}`}
                            style={{ maxWidth: '100%', maxHeight: '400px' }}
                            fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0xMiA4VjE2TTggMTJIMTYiIHN0cm9rZT0iIzk5OTk5OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPC9zdmc+"
                          />
                        </div>
                      ))
                    ) : (
                      <Image
                        src={selectedBadge.documents}
                        alt="Document"
                        style={{ maxWidth: '100%', maxHeight: '400px' }}
                        fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0xMiA4VjE2TTggMTJIMTYiIHN0cm9rZT0iIzk5OTk5OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPC9zdmc+"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    </ProtectedRoute>
  );
}

