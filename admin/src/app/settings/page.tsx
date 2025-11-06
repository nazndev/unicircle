'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/lib/api';
import {
  Card,
  Form,
  Switch,
  Input,
  Button,
  Typography,
  Spin,
  Table,
  Space,
  Tag,
  Row,
  Col,
  Divider,
  Empty,
  Avatar,
} from 'antd';
import {
  SettingOutlined,
  SaveOutlined,
  FileTextOutlined,
  UserOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  MailOutlined,
  GlobalOutlined,
  ShoppingOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const { Title, Text } = Typography;

interface Settings {
  enableCrossUniversityMatching: boolean;
  enableMarketplace: boolean;
  enableCareerFeatures: boolean;
  reportNotificationEmail: string;
}

interface AuditLog {
  id: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  createdAt: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    enableCrossUniversityMatching: false,
    enableMarketplace: true,
    enableCareerFeatures: true,
    reportNotificationEmail: '',
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
    loadAuditLogs();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get('/admin/settings');
      const data = response.data?.data || response.data;
      setSettings(data || {
        enableCrossUniversityMatching: false,
        enableMarketplace: true,
        enableCareerFeatures: true,
        reportNotificationEmail: '',
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const response = await api.get('/admin/audit?page=1&limit=100');
      const data = response.data?.data || response.data;
      setAuditLogs(Array.isArray(data?.logs) ? data.logs : (Array.isArray(data) ? data : []));
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      setAuditLogs([]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/admin/settings', settings);
      toast.success('Settings saved');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole={['super_admin']}>
        <div className="flex flex-col items-center justify-center h-96">
          <Spin size="large" />
          <Text type="secondary" className="mt-4">Loading settings...</Text>
        </div>
      </ProtectedRoute>
    );
  }

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
        <Tag color="purple" className="capitalize">
          {entity}
        </Tag>
      ),
    },
    {
      title: 'Entity ID',
      dataIndex: 'entityId',
      key: 'entityId',
      width: 200,
      render: (id) => <Text code>{id}</Text>,
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date) => format(new Date(date), 'MMM dd, yyyy HH:mm'),
    },
  ];

  return (
    <ProtectedRoute requiredRole={['super_admin']}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <Title level={2} className="!mb-2 !text-gray-900">Platform Settings</Title>
            <Text type="secondary">Manage platform configuration and view audit logs</Text>
          </div>
        </div>

        <Row gutter={[24, 24]}>
          {/* Settings Card */}
          <Col xs={24} lg={12}>
            <Card
              title={
                <div className="flex items-center space-x-2">
                  <SettingOutlined className="text-blue-500" />
                  <span>Platform Configuration</span>
                </div>
              }
              className="shadow-md border-0"
            >
              <Form layout="vertical" className="space-y-4">
                <Form.Item label="Cross-University Matching">
                  <div className="flex items-center justify-between">
                    <div>
                      <Text strong>Enable Cross-University Matching</Text>
                      <div>
                        <Text type="secondary" className="text-xs">
                          Allow users to match across different universities
                        </Text>
                      </div>
                    </div>
                    <Switch
                      checked={settings.enableCrossUniversityMatching}
                      onChange={(checked) =>
                        setSettings({ ...settings, enableCrossUniversityMatching: checked })
                      }
                      checkedChildren={<GlobalOutlined />}
                      unCheckedChildren={<GlobalOutlined />}
                    />
                  </div>
                </Form.Item>

                <Divider />

                <Form.Item label="Marketplace">
                  <div className="flex items-center justify-between">
                    <div>
                      <Text strong>Enable Marketplace</Text>
                      <div>
                        <Text type="secondary" className="text-xs">
                          Allow users to buy and sell items
                        </Text>
                      </div>
                    </div>
                    <Switch
                      checked={settings.enableMarketplace}
                      onChange={(checked) =>
                        setSettings({ ...settings, enableMarketplace: checked })
                      }
                      checkedChildren={<ShoppingOutlined />}
                      unCheckedChildren={<ShoppingOutlined />}
                    />
                  </div>
                </Form.Item>

                <Divider />

                <Form.Item label="Career Features">
                  <div className="flex items-center justify-between">
                    <div>
                      <Text strong>Enable Career Features</Text>
                      <div>
                        <Text type="secondary" className="text-xs">
                          Enable job postings and career-related features
                        </Text>
                      </div>
                    </div>
                    <Switch
                      checked={settings.enableCareerFeatures}
                      onChange={(checked) =>
                        setSettings({ ...settings, enableCareerFeatures: checked })
                      }
                      checkedChildren={<ThunderboltOutlined />}
                      unCheckedChildren={<ThunderboltOutlined />}
                    />
                  </div>
                </Form.Item>

                <Divider />

                <Form.Item label="Report Notification Email">
                  <Input
                    type="email"
                    prefix={<MailOutlined />}
                    placeholder="admin@unicircle.pro"
                    value={settings.reportNotificationEmail}
                    onChange={(e) =>
                      setSettings({ ...settings, reportNotificationEmail: e.target.value })
                    }
                    size="large"
                  />
                  <Text type="secondary" className="text-xs mt-1 block">
                    Email address to receive report notifications
                  </Text>
                </Form.Item>

                <Form.Item className="mb-0 mt-6">
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleSave}
                    loading={saving}
                    block
                    size="large"
                  >
                    {saving ? 'Saving...' : 'Save Settings'}
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>

          {/* Audit Logs Card */}
          <Col xs={24} lg={12}>
            <Card
              title={
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileTextOutlined className="text-green-500" />
                    <span>Audit Logs</span>
                  </div>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={loadAuditLogs}
                    size="small"
                  >
                    Refresh
                  </Button>
                </div>
              }
              className="shadow-md border-0"
            >
              <Table
                columns={auditColumns}
                dataSource={auditLogs}
                rowKey="id"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                }}
                scroll={{ y: 400 }}
                locale={{
                  emptyText: (
                    <Empty
                      image={<FileTextOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
                      description="No audit logs found"
                    />
                  ),
                }}
                size="small"
              />
            </Card>
          </Col>
        </Row>
      </div>
    </ProtectedRoute>
  );
}

