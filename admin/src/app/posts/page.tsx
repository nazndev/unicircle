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
  Badge,
} from 'antd';
import {
  MessageOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  UserOutlined,
  LikeOutlined,
  CommentOutlined,
  ReloadOutlined,
  SearchOutlined,
  FilterOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface Post {
  id: string;
  content: string;
  isHidden: boolean;
  createdAt: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  likesCount: number;
  commentsCount: number;
}

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/posts?scope=admin');
      const data = response.data?.data || response.data;
      setPosts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load posts:', error);
      toast.error('Failed to load posts');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleHide = async (id: string, isHidden: boolean) => {
    try {
      await api.put(`/admin/posts/${id}/hide`, { isHidden: !isHidden });
      toast.success(`Post ${!isHidden ? 'hidden' : 'shown'} successfully`);
      loadPosts();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update post');
    }
  };

  const filteredPosts = Array.isArray(posts) ? posts.filter((p) => {
    // Filter by visibility
    if (filter === 'visible' && p.isHidden) return false;
    if (filter === 'hidden' && !p.isHidden) return false;
    
    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        p.content.toLowerCase().includes(search) ||
        p.author.name?.toLowerCase().includes(search) ||
        p.author.email.toLowerCase().includes(search)
      );
    }
    
    return true;
  }) : [];

  const columns: ColumnsType<Post> = [
    {
      title: 'Author',
      key: 'author',
      width: 200,
      render: (_, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#2358d6' }} />
          <div>
            <div className="font-medium text-gray-900">
              {record.author.name || 'No name'}
            </div>
            <Text type="secondary" className="text-xs">{record.author.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Content',
      key: 'content',
      width: 400,
      render: (_, record) => (
        <Paragraph
          ellipsis={{ rows: 2, expandable: true, symbol: 'more' }}
          className="mb-0"
        >
          {record.content}
        </Paragraph>
      ),
    },
    {
      title: 'Engagement',
      key: 'engagement',
      width: 150,
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Space>
            <LikeOutlined className="text-gray-400" />
            <Text>{record.likesCount || 0}</Text>
          </Space>
          <Space>
            <CommentOutlined className="text-gray-400" />
            <Text>{record.commentsCount || 0}</Text>
          </Space>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isHidden',
      key: 'status',
      width: 120,
      render: (isHidden) => (
        <Tag color={isHidden ? 'error' : 'success'} icon={isHidden ? <EyeInvisibleOutlined /> : <EyeOutlined />}>
          {isHidden ? 'Hidden' : 'Visible'}
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
      width: 120,
      render: (_, record) => (
        <Popconfirm
          title={`Are you sure you want to ${record.isHidden ? 'show' : 'hide'} this post?`}
          onConfirm={() => handleHide(record.id, record.isHidden)}
          okText="Yes"
          cancelText="No"
        >
          <Tooltip title={record.isHidden ? 'Show post' : 'Hide post'}>
            <Button
              type={record.isHidden ? 'primary' : 'default'}
              danger={!record.isHidden}
              icon={record.isHidden ? <EyeOutlined /> : <EyeInvisibleOutlined />}
              size="small"
            >
              {record.isHidden ? 'Show' : 'Hide'}
            </Button>
          </Tooltip>
        </Popconfirm>
      ),
    },
  ];

  const visibleCount = posts.filter((p) => !p.isHidden).length;
  const hiddenCount = posts.filter((p) => p.isHidden).length;

  const stats = [
    {
      title: 'Total Posts',
      value: posts.length,
      icon: <MessageOutlined />,
      color: '#2358d6',
    },
    {
      title: 'Visible Posts',
      value: visibleCount,
      icon: <EyeOutlined />,
      color: '#10b981',
    },
    {
      title: 'Hidden Posts',
      value: hiddenCount,
      icon: <EyeInvisibleOutlined />,
      color: '#ef4444',
    },
  ];

  if (loading) {
    return (
      <ProtectedRoute requiredRole={['super_admin', 'admin', 'moderator']}>
        <div className="flex flex-col items-center justify-center h-96">
          <Spin size="large" />
          <Text type="secondary" className="mt-4">Loading posts...</Text>
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
            <Title level={2} className="!mb-2 !text-gray-900">Posts Moderation</Title>
            <Text type="secondary">Manage and moderate all platform posts</Text>
          </div>
          <Tooltip title="Refresh posts">
            <Button
              icon={<ReloadOutlined />}
              onClick={loadPosts}
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
                placeholder="Search by content, author name or email..."
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
                <Option value="all">All Posts</Option>
                <Option value="visible">Visible Only</Option>
                <Option value="hidden">Hidden Only</Option>
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

        {/* Posts Table */}
        <Card className="shadow-md border-0">
          <Table
            columns={columns}
            dataSource={filteredPosts}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} post${total !== 1 ? 's' : ''}`,
            }}
            locale={{
              emptyText: (
                <Empty
                  image={<MessageOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
                  description="No posts found"
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

