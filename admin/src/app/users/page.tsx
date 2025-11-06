'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/lib/api';
import {
  Table,
  Input,
  Select,
  Button,
  Card,
  Tag,
  Space,
  Avatar,
  Typography,
  Spin,
  Popconfirm,
  Tooltip,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  UserOutlined,
  SearchOutlined,
  ReloadOutlined,
  StopOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const { Title, Text } = Typography;
const { Option } = Select;

interface UserData {
  id: string;
  name: string | null;
  email: string;
  profileMode: string;
  verificationStatus: string;
  isBlocked: boolean;
  isVerified: boolean;
  university: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    profileMode: '',
    verificationStatus: '',
  });
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    loadUsers();
  }, [pagination.page, pagination.limit, filters]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());
      if (filters.profileMode) params.append('profileMode', filters.profileMode);
      if (filters.verificationStatus) params.append('verificationStatus', filters.verificationStatus);
      
      const response = await api.get(`/admin/users?${params.toString()}`);
      const data = response.data?.data || response.data;
      setUsers(data.users || []);
      setPagination(prev => ({
        ...prev,
        total: data.pagination?.total || 0,
        totalPages: data.pagination?.totalPages || 0,
      }));
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleBlock = async (userId: string, isBlocked: boolean) => {
    try {
      await api.put(`/admin/users/${userId}/block`, { isBlocked: !isBlocked });
      toast.success(`User ${!isBlocked ? 'blocked' : 'unblocked'} successfully`);
      loadUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update user');
    }
  };

  const filteredUsers = users.filter(user => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        user.name?.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const getStatusTag = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      approved: { color: 'success', icon: <CheckCircleOutlined /> },
      pending: { color: 'warning', icon: <ClockCircleOutlined /> },
      rejected: { color: 'error', icon: <CloseCircleOutlined /> },
    };
    const config = statusConfig[status] || { color: 'default', icon: null };
    return (
      <Tag color={config.color} icon={config.icon} className="capitalize">
        {status}
      </Tag>
    );
  };

  const getProfileModeTag = (mode: string) => {
    const modeColors: Record<string, string> = {
      student: 'blue',
      alumni: 'purple',
      professional: 'cyan',
    };
    return (
      <Tag color={modeColors[mode] || 'default'} className="capitalize">
        {mode}
      </Tag>
    );
  };

  const columns: ColumnsType<UserData> = [
    {
      title: 'User',
      key: 'user',
      width: 300,
      render: (_, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#2358d6' }} />
          <div>
            <div className="font-medium text-gray-900">
              {record.name || 'No name'}
            </div>
            <Text type="secondary" className="text-xs">{record.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'University',
      dataIndex: ['university', 'name'],
      key: 'university',
      render: (text) => text || <Text type="secondary">N/A</Text>,
    },
    {
      title: 'Profile Mode',
      dataIndex: 'profileMode',
      key: 'profileMode',
      render: (mode) => getProfileModeTag(mode),
    },
    {
      title: 'Verification Status',
      dataIndex: 'verificationStatus',
      key: 'verificationStatus',
      render: (status) => getStatusTag(status),
    },
    {
      title: 'Account Status',
      key: 'accountStatus',
      render: (_, record) => (
        <Space direction="vertical" size="small">
          {record.isBlocked ? (
            <Tag color="error" icon={<StopOutlined />}>Blocked</Tag>
          ) : (
            <Tag color="success" icon={<CheckCircleOutlined />}>Active</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Joined',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => format(new Date(date), 'MMM dd, yyyy'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Popconfirm
          title={`Are you sure you want to ${record.isBlocked ? 'unblock' : 'block'} this user?`}
          onConfirm={() => handleBlock(record.id, record.isBlocked)}
          okText="Yes"
          cancelText="No"
        >
          <Tooltip title={record.isBlocked ? 'Unblock user' : 'Block user'}>
            <Button
              type="text"
              danger={!record.isBlocked}
              icon={<StopOutlined />}
              size="small"
            >
              {record.isBlocked ? 'Unblock' : 'Block'}
            </Button>
          </Tooltip>
        </Popconfirm>
      ),
    },
  ];

  const stats = [
    {
      title: 'Total Users',
      value: pagination.total,
      icon: <TeamOutlined />,
      color: '#2358d6',
    },
    {
      title: 'Active Users',
      value: users.filter(u => !u.isBlocked).length,
      icon: <CheckCircleOutlined />,
      color: '#10b981',
    },
    {
      title: 'Blocked Users',
      value: users.filter(u => u.isBlocked).length,
      icon: <StopOutlined />,
      color: '#ef4444',
    },
    {
      title: 'Pending Verification',
      value: users.filter(u => u.verificationStatus === 'pending').length,
      icon: <ClockCircleOutlined />,
      color: '#f59e0b',
    },
  ];

  return (
    <ProtectedRoute requiredRole={['super_admin', 'admin']}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <Title level={2} className="!mb-2 !text-gray-900">User Management</Title>
            <Text type="secondary">Manage and monitor all platform users</Text>
          </div>
        </div>

        {/* Stats Cards */}
        <Row gutter={[16, 16]}>
          {stats.map((stat, index) => (
            <Col xs={24} sm={12} lg={6} key={index}>
              <Card className="shadow-md border-0">
                <Statistic
                  title={<Text className="text-gray-600">{stat.title}</Text>}
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
            <Col xs={24} sm={12} md={8}>
              <Input
                placeholder="Search by name or email..."
                prefix={<SearchOutlined />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                allowClear
                size="large"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                placeholder="Profile Mode"
                value={filters.profileMode || undefined}
                onChange={(value) => setFilters({ ...filters, profileMode: value })}
                allowClear
                size="large"
                className="w-full"
              >
                <Option value="student">Student</Option>
                <Option value="alumni">Alumni</Option>
                <Option value="professional">Professional</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                placeholder="Verification Status"
                value={filters.verificationStatus || undefined}
                onChange={(value) => setFilters({ ...filters, verificationStatus: value })}
                allowClear
                size="large"
                className="w-full"
              >
                <Option value="pending">Pending</Option>
                <Option value="approved">Approved</Option>
                <Option value="rejected">Rejected</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={loadUsers}
                  size="large"
                >
                  Refresh
                </Button>
                {(filters.profileMode || filters.verificationStatus) && (
                  <Button
                    onClick={() => {
                      setFilters({ profileMode: '', verificationStatus: '' });
                      setSearchTerm('');
                    }}
                    size="large"
                  >
                    Clear
                  </Button>
                )}
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Users Table */}
        <Card className="shadow-md border-0">
          <Table
            columns={columns}
            dataSource={filteredUsers}
            rowKey="id"
            loading={loading}
            pagination={{
              current: pagination.page,
              pageSize: pagination.limit,
              total: pagination.total,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} users`,
              onChange: (page, pageSize) => {
                setPagination(prev => ({ ...prev, page, limit: pageSize }));
              },
            }}
            scroll={{ x: 1000 }}
          />
        </Card>
      </div>
    </ProtectedRoute>
  );
}
