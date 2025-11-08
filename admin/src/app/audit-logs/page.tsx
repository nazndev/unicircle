'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/lib/api';
import {
  Card,
  Table,
  Space,
  Tag,
  Typography,
  Spin,
  Button,
  Empty,
  Avatar,
  Input,
  Select,
} from 'antd';
import {
  FileTextOutlined,
  UserOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { format } from 'date-fns';

const { Title, Text } = Typography;

interface AuditLog {
  id: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  createdAt: string;
}

export default function AuditLogsPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    try {
      const response = await api.get('/admin/audit?page=1&limit=1000');
      // Handle nested response structure
      let data = response.data?.data || response.data;
      if (data?.data && typeof data.data === 'object') {
        data = data.data;
      } else if (data?.success && data?.data) {
        data = data.data;
      }
      // Extract logs from response - backend returns { logs: [...], pagination: {...} }
      setAuditLogs(Array.isArray(data?.logs) ? data.logs : (Array.isArray(data) ? data : []));
    } catch (error: any) {
      console.error('Failed to load audit logs:', error);
      // Don't show error toast for network errors - they're handled by api interceptor
      if (error.response?.status !== 401 && error.response?.status !== 403) {
        console.error('Audit logs error details:', error.response?.data || error.message);
      }
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const auditColumns: ColumnsType<AuditLog> = [
    {
      title: 'Actor',
      key: 'actor',
      width: 200,
      render: (_, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#2358d6' }} />
          <Text>{record.actor}</Text>
        </Space>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 200,
      render: (action) => (
        <Tag color="blue" className="capitalize">
          {action.replace(/_/g, ' ')}
        </Tag>
      ),
    },
    {
      title: 'Entity',
      dataIndex: 'entity',
      key: 'entity',
      width: 150,
      render: (entity) => (
        <Tag color="green" className="capitalize">
          {entity}
        </Tag>
      ),
    },
    {
      title: 'Entity ID',
      dataIndex: 'entityId',
      key: 'entityId',
      width: 200,
      render: (id) => (
        <Text code className="text-xs">
          {id.substring(0, 8)}...
        </Text>
      ),
    },
    {
      title: 'Date & Time',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 200,
      render: (date) => format(new Date(date), 'MMM dd, yyyy HH:mm'),
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
  ];

  // Filter audit logs
  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      searchText === '' ||
      log.actor.toLowerCase().includes(searchText.toLowerCase()) ||
      log.action.toLowerCase().includes(searchText.toLowerCase()) ||
      log.entity.toLowerCase().includes(searchText.toLowerCase());

    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesEntity = entityFilter === 'all' || log.entity === entityFilter;

    return matchesSearch && matchesAction && matchesEntity;
  });

  // Get unique actions and entities for filters
  const uniqueActions = Array.from(new Set(auditLogs.map((log) => log.action)));
  const uniqueEntities = Array.from(new Set(auditLogs.map((log) => log.entity)));

  if (loading) {
    return (
      <ProtectedRoute requiredRole={['super_admin']}>
        <div className="flex flex-col items-center justify-center h-96">
          <Spin size="large" />
          <Text type="secondary" className="mt-4">Loading audit logs...</Text>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole={['super_admin']}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <Title level={2} className="!mb-2 !text-gray-900">Audit Logs</Title>
            <Text type="secondary">Track all administrative actions and system changes</Text>
          </div>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadAuditLogs}
            loading={loading}
            size="large"
          >
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card className="shadow-sm border-0">
          <Space direction="vertical" className="w-full" size="middle">
            <div className="flex items-center space-x-4 flex-wrap">
              <Input
                placeholder="Search by actor, action, or entity..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 300 }}
                allowClear
              />
              <Select
                placeholder="Filter by Action"
                value={actionFilter}
                onChange={setActionFilter}
                style={{ width: 200 }}
              >
                <Select.Option value="all">All Actions</Select.Option>
                {uniqueActions.map((action) => (
                  <Select.Option key={action} value={action}>
                    {action.replace(/_/g, ' ')}
                  </Select.Option>
                ))}
              </Select>
              <Select
                placeholder="Filter by Entity"
                value={entityFilter}
                onChange={setEntityFilter}
                style={{ width: 200 }}
              >
                <Select.Option value="all">All Entities</Select.Option>
                {uniqueEntities.map((entity) => (
                  <Select.Option key={entity} value={entity}>
                    {entity}
                  </Select.Option>
                ))}
              </Select>
            </div>
          </Space>
        </Card>

        {/* Audit Logs Table */}
        <Card
          title={
            <div className="flex items-center space-x-2">
              <FileTextOutlined className="text-green-500" />
              <span>Activity Log</span>
              <Tag color="blue" className="ml-2">
                {filteredLogs.length} {filteredLogs.length === 1 ? 'entry' : 'entries'}
              </Tag>
            </div>
          }
          className="shadow-md border-0"
        >
          <Table
            columns={auditColumns}
            dataSource={filteredLogs}
            rowKey="id"
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} entries`,
            }}
            scroll={{ x: 1000 }}
            locale={{
              emptyText: (
                <Empty
                  image={<FileTextOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
                  description="No audit logs found"
                />
              ),
            }}
            size="middle"
          />
        </Card>
      </div>
    </ProtectedRoute>
  );
}

