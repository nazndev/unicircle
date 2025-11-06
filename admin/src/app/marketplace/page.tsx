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
} from 'antd';
import {
  ShoppingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  FilterOutlined,
  UserOutlined,
  DollarOutlined,
  TagOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  isActive: boolean;
  createdAt: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
}

export default function MarketplacePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/marketplace?admin=true');
      const data = response.data?.data || response.data;
      setListings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load listings:', error);
      toast.error('Failed to load marketplace listings');
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (id: string, isActive: boolean) => {
    try {
      await api.put(`/admin/marketplace/${id}/deactivate`, { isActive: !isActive });
      toast.success(`Listing ${!isActive ? 'activated' : 'deactivated'} successfully`);
      loadListings();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update listing');
    }
  };

  const filteredListings = Array.isArray(listings) ? listings.filter((l) => {
    // Filter by status
    if (filter === 'active' && !l.isActive) return false;
    if (filter === 'inactive' && l.isActive) return false;
    
    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        l.title.toLowerCase().includes(search) ||
        l.description.toLowerCase().includes(search) ||
        l.category.toLowerCase().includes(search) ||
        l.owner.name?.toLowerCase().includes(search) ||
        l.owner.email.toLowerCase().includes(search)
      );
    }
    
    return true;
  }) : [];

  const columns: ColumnsType<Listing> = [
    {
      title: 'Listing',
      key: 'listing',
      width: 300,
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <div className="font-medium text-gray-900">{record.title}</div>
          <Paragraph
            ellipsis={{ rows: 2, expandable: true, symbol: 'more' }}
            className="mb-0 text-sm"
          >
            {record.description}
          </Paragraph>
        </Space>
      ),
    },
    {
      title: 'Owner',
      key: 'owner',
      width: 200,
      render: (_, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#2358d6' }} />
          <div>
            <div className="font-medium text-gray-900">
              {record.owner.name || 'No name'}
            </div>
            <Text type="secondary" className="text-xs">{record.owner.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      width: 120,
      render: (price) => (
        <Space>
          <DollarOutlined className="text-green-500" />
          <Text strong className="text-green-600" style={{ fontSize: '16px' }}>
            ${price.toFixed(2)}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 150,
      render: (category) => (
        <Tag icon={<TagOutlined />} color="blue" className="capitalize">
          {category}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'status',
      width: 120,
      render: (isActive) => (
        <Tag color={isActive ? 'success' : 'error'} icon={isActive ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date) => format(new Date(date), 'MMM dd, yyyy'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Popconfirm
          title={`Are you sure you want to ${record.isActive ? 'deactivate' : 'activate'} this listing?`}
          onConfirm={() => handleDeactivate(record.id, record.isActive)}
          okText="Yes"
          cancelText="No"
        >
          <Tooltip title={record.isActive ? 'Deactivate listing' : 'Activate listing'}>
            <Button
              type={record.isActive ? 'default' : 'primary'}
              danger={record.isActive}
              icon={record.isActive ? <CloseCircleOutlined /> : <CheckCircleOutlined />}
              size="small"
            >
              {record.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </Tooltip>
        </Popconfirm>
      ),
    },
  ];

  const activeCount = listings.filter((l) => l.isActive).length;
  const inactiveCount = listings.filter((l) => !l.isActive).length;
  const totalValue = listings.reduce((sum, l) => sum + (l.isActive ? l.price : 0), 0);

  const stats = [
    {
      title: 'Total Listings',
      value: listings.length,
      icon: <ShoppingOutlined />,
      color: '#2358d6',
    },
    {
      title: 'Active Listings',
      value: activeCount,
      icon: <CheckCircleOutlined />,
      color: '#10b981',
    },
    {
      title: 'Inactive Listings',
      value: inactiveCount,
      icon: <CloseCircleOutlined />,
      color: '#ef4444',
    },
    {
      title: 'Total Value',
      value: `$${totalValue.toFixed(2)}`,
      icon: <DollarOutlined />,
      color: '#8b5cf6',
    },
  ];

  if (loading) {
    return (
      <ProtectedRoute requiredRole={['super_admin', 'admin', 'moderator']}>
        <div className="flex flex-col items-center justify-center h-96">
          <Spin size="large" />
          <Text type="secondary" className="mt-4">Loading marketplace listings...</Text>
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
            <Title level={2} className="!mb-2 !text-gray-900">Marketplace Management</Title>
            <Text type="secondary">Manage and moderate all marketplace listings</Text>
          </div>
          <Tooltip title="Refresh listings">
            <Button
              icon={<ReloadOutlined />}
              onClick={loadListings}
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

        {/* Filters */}
        <Card className="shadow-md border-0">
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={12} md={10}>
              <Input
                placeholder="Search by title, description, category, or owner..."
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
                <Option value="all">All Listings</Option>
                <Option value="active">Active Only</Option>
                <Option value="inactive">Inactive Only</Option>
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

        {/* Listings Table */}
        <Card className="shadow-md border-0">
          <Table
            columns={columns}
            dataSource={filteredListings}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} listing${total !== 1 ? 's' : ''}`,
            }}
            locale={{
              emptyText: (
                <Empty
                  image={<ShoppingOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
                  description="No listings found"
                />
              ),
            }}
            scroll={{ x: 1000 }}
          />
        </Card>
      </div>
    </ProtectedRoute>
  );
}
