'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/lib/api';
import { Card, Row, Col, Statistic, Typography, Space, Button, Spin, Tag, Divider, Tooltip } from 'antd';
import { 
  UserOutlined, 
  FileTextOutlined, 
  MessageOutlined, 
  ShoppingOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  FileDoneOutlined,
  ThunderboltOutlined,
  DatabaseOutlined,
  ApiOutlined,
  ArrowRightOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';

const { Title, Text } = Typography;

interface Metrics {
  users?: {
    total: number;
    verified?: number;
    pendingAlumni?: number;
  };
  matches?: number;
  posts?: number;
  jobs?: number;
  marketplace?: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const response = await api.get('/admin/metrics');
      const data = response.data?.data || response.data;
      setMetrics(data);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const stats = [
    {
      title: 'Total Users',
      value: metrics?.users?.total || 0,
      icon: <UserOutlined />,
      color: '#2358d6',
    },
    {
      title: 'Pending Alumni',
      value: metrics?.users?.pendingAlumni || 0,
      icon: <FileTextOutlined />,
      color: '#f59e0b',
    },
    {
      title: 'Total Posts',
      value: metrics?.posts || 0,
      icon: <MessageOutlined />,
      color: '#10b981',
    },
    {
      title: 'Marketplace',
      value: metrics?.marketplace || 0,
      icon: <ShoppingOutlined />,
      color: '#8b5cf6',
    },
  ];

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex flex-col items-center justify-center h-96">
          <Spin size="large" />
          <Text type="secondary" className="mt-4">Loading dashboard...</Text>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <Title level={2} className="!mb-2 !text-gray-900">Dashboard Overview</Title>
            <Text type="secondary">Welcome back! Here's what's happening with your platform today.</Text>
          </div>
          <Tooltip title="Refresh metrics">
            <Button
              icon={<ReloadOutlined />}
              onClick={() => loadMetrics(true)}
              loading={refreshing}
              size="large"
            >
              Refresh
            </Button>
          </Tooltip>
        </div>

        {/* Primary Stats Cards */}
        <Row gutter={[24, 24]}>
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

        {/* Secondary Stats Row */}
        <Row gutter={[24, 24]}>
          <Col xs={24} sm={12} lg={6}>
            <Card className="shadow-md border-0 hover:shadow-lg transition-all duration-300" styles={{ body: { padding: '24px' } }}>
              <Statistic
                title={<Text className="text-gray-600 font-medium">Verified Users</Text>}
                value={metrics?.users?.verified || 0}
                prefix={<CheckCircleOutlined style={{ color: '#10b981', fontSize: '18px' }} />}
                valueStyle={{ fontSize: '24px', fontWeight: 600, color: '#10b981' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="shadow-md border-0 hover:shadow-lg transition-all duration-300" styles={{ body: { padding: '24px' } }}>
              <Statistic
                title={<Text className="text-gray-600 font-medium">Total Matches</Text>}
                value={metrics?.matches || 0}
                prefix={<TeamOutlined style={{ color: '#8b5cf6', fontSize: '18px' }} />}
                valueStyle={{ fontSize: '24px', fontWeight: 600, color: '#8b5cf6' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="shadow-md border-0 hover:shadow-lg transition-all duration-300" styles={{ body: { padding: '24px' } }}>
              <Statistic
                title={<Text className="text-gray-600 font-medium">Active Jobs</Text>}
                value={metrics?.jobs || 0}
                prefix={<ThunderboltOutlined style={{ color: '#f59e0b', fontSize: '18px' }} />}
                valueStyle={{ fontSize: '24px', fontWeight: 600, color: '#f59e0b' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="shadow-md border-0 hover:shadow-lg transition-all duration-300" styles={{ body: { padding: '24px' } }}>
              <Statistic
                title={<Text className="text-gray-600 font-medium">Active Listings</Text>}
                value={metrics?.marketplace || 0}
                prefix={<ShoppingOutlined style={{ color: '#ef4444', fontSize: '18px' }} />}
                valueStyle={{ fontSize: '24px', fontWeight: 600, color: '#ef4444' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Quick Actions & System Status */}
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={14}>
            <Card 
              title={
                <div className="flex items-center space-x-2">
                  <ThunderboltOutlined className="text-blue-500 text-lg" />
                  <span className="font-semibold text-base">Quick Actions</span>
                </div>
              }
              className="shadow-md border-0 h-full"
              styles={{ body: { padding: '24px' } }}
            >
              <Space direction="vertical" className="w-full" size="middle">
                <Button
                  type="primary"
                  block
                  size="large"
                  icon={<FileDoneOutlined />}
                  onClick={() => router.push('/alumni')}
                  className="h-auto py-5 text-left flex items-center justify-start hover:shadow-md transition-all"
                  style={{ height: 'auto', padding: '20px' }}
                >
                  <div className="flex-1">
                    <div className="font-semibold text-base mb-1">Review Alumni Requests</div>
                    <div className="text-sm text-gray-400 font-normal">
                      {metrics?.users?.pendingAlumni || 0} pending approval{metrics?.users?.pendingAlumni !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <ArrowRightOutlined className="ml-auto text-lg" />
                </Button>
                <Button
                  type="default"
                  block
                  size="large"
                  icon={<CheckCircleOutlined />}
                  onClick={() => router.push('/reports')}
                  className="h-auto py-5 text-left flex items-center justify-start border-gray-200 hover:border-blue-500 hover:shadow-md transition-all"
                  style={{ height: 'auto', padding: '20px' }}
                >
                  <div className="flex-1">
                    <div className="font-semibold text-base mb-1">View Reports</div>
                    <div className="text-sm text-gray-400 font-normal">
                      Moderate and review reported content
                    </div>
                  </div>
                  <ArrowRightOutlined className="ml-auto text-lg" />
                </Button>
              </Space>
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card 
              title={
                <div className="flex items-center space-x-2">
                  <DatabaseOutlined className="text-green-500 text-lg" />
                  <span className="font-semibold text-base">System Status</span>
                </div>
              }
              className="shadow-md border-0 h-full"
              styles={{ body: { padding: '24px' } }}
            >
              <Space direction="vertical" className="w-full" size="large">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                      <ApiOutlined className="text-white text-lg" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">API Status</div>
                      <Text type="secondary" className="text-xs">Backend service</Text>
                    </div>
                  </div>
                  <Tag color="success" icon={<CheckCircleOutlined />} className="m-0 px-3 py-1">
                    Online
                  </Tag>
                </div>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                      <DatabaseOutlined className="text-white text-lg" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Database</div>
                      <Text type="secondary" className="text-xs">PostgreSQL connection</Text>
                    </div>
                  </div>
                  <Tag color="success" icon={<CheckCircleOutlined />} className="m-0 px-3 py-1">
                    Connected
                  </Tag>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
      </div>
    </ProtectedRoute>
  );
}
