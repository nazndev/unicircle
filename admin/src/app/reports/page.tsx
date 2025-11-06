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
  Avatar,
  Input,
  Select,
  Modal,
  Descriptions,
} from 'antd';
import {
  FlagOutlined,
  UserOutlined,
  MessageOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface Report {
  id: string;
  reason: string;
  contextType: string;
  contextId: string;
  status: string;
  createdAt: string;
  reportedBy: {
    id: string;
    name: string;
    email: string;
  };
  reportedUser: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/reports');
      const data = response.data?.data || response.data;
      setReports(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load reports:', error);
      toast.error('Failed to load reports');
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await api.post(`/admin/reports/${id}/resolve`);
      toast.success('Report resolved successfully');
      loadReports();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to resolve report');
    }
  };

  const viewDetails = (report: Report) => {
    setSelectedReport(report);
    setShowDetailModal(true);
  };

  const filteredReports = Array.isArray(reports) ? reports.filter((r) => {
    // Filter by status
    if (filter === 'pending' && r.status !== 'pending') return false;
    if (filter === 'resolved' && r.status !== 'resolved') return false;
    
    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        r.reason.toLowerCase().includes(search) ||
        r.contextType.toLowerCase().includes(search) ||
        r.reportedBy.name?.toLowerCase().includes(search) ||
        r.reportedBy.email.toLowerCase().includes(search) ||
        r.reportedUser?.name?.toLowerCase().includes(search) ||
        r.reportedUser?.email.toLowerCase().includes(search)
      );
    }
    
    return true;
  }) : [];

  const columns: ColumnsType<Report> = [
    {
      title: 'Reported By',
      key: 'reportedBy',
      width: 200,
      render: (_, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#2358d6' }} />
          <div>
            <div className="font-medium text-gray-900">
              {record.reportedBy.name || 'No name'}
            </div>
            <Text type="secondary" className="text-xs">{record.reportedBy.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Reason',
      key: 'reason',
      width: 300,
      render: (_, record) => (
        <Paragraph
          ellipsis={{ rows: 2, expandable: true, symbol: 'more' }}
          className="mb-0"
        >
          {record.reason}
        </Paragraph>
      ),
    },
    {
      title: 'Context',
      dataIndex: 'contextType',
      key: 'contextType',
      width: 150,
      render: (contextType) => (
        <Tag icon={<MessageOutlined />} color="blue" className="capitalize">
          {contextType || 'N/A'}
        </Tag>
      ),
    },
    {
      title: 'Reported User',
      key: 'reportedUser',
      width: 200,
      render: (_, record) => (
        record.reportedUser ? (
          <Space>
            <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#ef4444' }} />
            <div>
              <div className="font-medium text-gray-900">
                {record.reportedUser.name || 'No name'}
              </div>
              <Text type="secondary" className="text-xs">{record.reportedUser.email}</Text>
            </div>
          </Space>
        ) : (
          <Text type="secondary">N/A</Text>
        )
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => (
        <Tag 
          color={status === 'pending' ? 'warning' : 'success'} 
          icon={status === 'pending' ? <ClockCircleOutlined /> : <CheckCircleOutlined />}
        >
          {status}
        </Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date) => format(new Date(date), 'MMM dd, yyyy HH:mm'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Tooltip title="View details">
            <Button
              type="default"
              icon={<EyeOutlined />}
              onClick={() => viewDetails(record)}
              size="small"
            >
              View
            </Button>
          </Tooltip>
          {record.status === 'pending' && (
            <Popconfirm
              title="Resolve this report?"
              description="This will mark the report as resolved."
              onConfirm={() => handleResolve(record.id)}
              okText="Yes, Resolve"
              cancelText="Cancel"
            >
              <Tooltip title="Resolve report">
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  size="small"
                >
                  Resolve
                </Button>
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const pendingCount = reports.filter((r) => r.status === 'pending').length;
  const resolvedCount = reports.filter((r) => r.status === 'resolved').length;

  const stats = [
    {
      title: 'Total Reports',
      value: reports.length,
      icon: <FlagOutlined />,
      color: '#2358d6',
    },
    {
      title: 'Pending Reports',
      value: pendingCount,
      icon: <ClockCircleOutlined />,
      color: '#f59e0b',
    },
    {
      title: 'Resolved Reports',
      value: resolvedCount,
      icon: <CheckCircleOutlined />,
      color: '#10b981',
    },
  ];

  if (loading) {
    return (
      <ProtectedRoute requiredRole={['super_admin', 'admin', 'moderator']}>
        <div className="flex flex-col items-center justify-center h-96">
          <Spin size="large" />
          <Text type="secondary" className="mt-4">Loading reports...</Text>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole={['super_admin', 'admin', 'moderator']}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <Title level={2} className="!mb-2 !text-gray-900">Reports & Moderation</Title>
            <Text type="secondary">Review and manage user reports</Text>
          </div>
          <Tooltip title="Refresh reports">
            <Button
              icon={<ReloadOutlined />}
              onClick={loadReports}
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
            <Col xs={24} sm={12} lg={8} key={index}>
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

        {/* Filters */}
        <Card className="shadow-md border-0">
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={12} md={10}>
              <Input
                placeholder="Search by reason, context, or user..."
                prefix={<SearchOutlined />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                allowClear
                size="large"
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Select
                placeholder="Filter by status"
                value={filter}
                onChange={(value) => setFilter(value)}
                size="large"
                className="w-full"
                suffixIcon={<FilterOutlined />}
              >
                <Option value="all">All Reports</Option>
                <Option value="pending">Pending Only</Option>
                <Option value="resolved">Resolved Only</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Space>
                {(filter !== 'all' || searchTerm) && (
                  <Button
                    onClick={() => {
                      setFilter('all');
                      setSearchTerm('');
                    }}
                    size="large"
                  >
                    Clear Filters
                  </Button>
                )}
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Reports Table */}
        <Card className="shadow-md border-0">
          <Table
            columns={columns}
            dataSource={filteredReports}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} report${total !== 1 ? 's' : ''}`,
            }}
            locale={{
              emptyText: (
                <Empty
                  image={<FlagOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
                  description="No reports found"
                />
              ),
            }}
            scroll={{ x: 1000 }}
          />
        </Card>

        {/* Report Detail Modal */}
        <Modal
          title={
            <div className="flex items-center space-x-2">
              <FlagOutlined className="text-red-500" />
              <span>Report Details</span>
            </div>
          }
          open={showDetailModal}
          onCancel={() => {
            setShowDetailModal(false);
            setSelectedReport(null);
          }}
          footer={[
            <Button key="close" onClick={() => {
              setShowDetailModal(false);
              setSelectedReport(null);
            }}>
              Close
            </Button>,
            selectedReport?.status === 'pending' && (
              <Popconfirm
                key="resolve"
                title="Resolve this report?"
                onConfirm={() => {
                  if (selectedReport) {
                    handleResolve(selectedReport.id);
                    setShowDetailModal(false);
                    setSelectedReport(null);
                  }
                }}
                okText="Yes"
                cancelText="No"
              >
                <Button type="primary" icon={<CheckCircleOutlined />}>
                  Resolve
                </Button>
              </Popconfirm>
            ),
          ].filter(Boolean)}
          width={700}
        >
          {selectedReport && (
            <Descriptions bordered column={1}>
              <Descriptions.Item label="Status">
                <Tag 
                  color={selectedReport.status === 'pending' ? 'warning' : 'success'} 
                  icon={selectedReport.status === 'pending' ? <ClockCircleOutlined /> : <CheckCircleOutlined />}
                >
                  {selectedReport.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Reason">
                <Paragraph className="mb-0">{selectedReport.reason}</Paragraph>
              </Descriptions.Item>
              <Descriptions.Item label="Context Type">
                <Tag icon={<MessageOutlined />} color="blue" className="capitalize">
                  {selectedReport.contextType || 'N/A'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Context ID">
                <Text code>{selectedReport.contextId}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Reported By">
                <Space>
                  <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#2358d6' }} />
                  <div>
                    <div className="font-medium">{selectedReport.reportedBy.name || 'No name'}</div>
                    <Text type="secondary" className="text-xs">{selectedReport.reportedBy.email}</Text>
                  </div>
                </Space>
              </Descriptions.Item>
              {selectedReport.reportedUser && (
                <Descriptions.Item label="Reported User">
                  <Space>
                    <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#ef4444' }} />
                    <div>
                      <div className="font-medium">{selectedReport.reportedUser.name || 'No name'}</div>
                      <Text type="secondary" className="text-xs">{selectedReport.reportedUser.email}</Text>
                    </div>
                  </Space>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Created At">
                {format(new Date(selectedReport.createdAt), 'MMM dd, yyyy HH:mm:ss')}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Modal>
      </div>
    </ProtectedRoute>
  );
}

