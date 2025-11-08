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
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Row,
  Col,
  Statistic,
  Empty,
  message,
} from 'antd';
import {
  BankOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  GlobalOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const { Title, Text } = Typography;

interface University {
  id: string;
  name: string;
  domain: string | null;
  country: string | { id: string; name: string; code: string | null };
  countryId?: string;
  active: boolean;
  allowCrossCampus: boolean;
  createdAt: string;
}

export default function UniversitiesPage() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUniversity, setEditingUniversity] = useState<University | null>(null);
  const [form] = Form.useForm();
  const [availableCountries, setAvailableCountries] = useState<Array<{ id: string; name: string; code: string | null }>>([]);

  useEffect(() => {
    loadUniversities();
    loadAvailableCountries();
  }, []);

  const loadAvailableCountries = async () => {
    try {
      const response = await api.get('/country/active');
      console.log('[UNIVERSITIES] Countries API Response:', response);
      // Handle nested response structure: response.data.data.data or response.data.data
      const data = response.data?.data?.data || response.data?.data || response.data || [];
      console.log('[UNIVERSITIES] Extracted countries data:', data);
      const countriesArray = Array.isArray(data) ? data : [];
      console.log('[UNIVERSITIES] Countries array length:', countriesArray.length);
      setAvailableCountries(countriesArray);
      if (countriesArray.length === 0) {
        console.warn('[UNIVERSITIES] No active countries found');
      }
    } catch (error) {
      console.error('[UNIVERSITIES] Failed to load available countries:', error);
    }
  };

  const loadUniversities = async () => {
    setLoading(true);
    try {
      const response = await api.get('/university');
      const data = response.data?.data || response.data;
      setUniversities(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load universities:', error);
      toast.error('Failed to load universities');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      // Trim all string values
      const trimmedValues = {
        ...values,
        name: values.name?.trim(),
        domain: values.domain?.trim(),
        countryId: values.countryId,
      };

      console.log('[UNIVERSITIES] Submitting form values:', trimmedValues);

      if (editingUniversity) {
        await api.put(`/admin/universities/${editingUniversity.id}`, trimmedValues);
        toast.success('University updated successfully');
      } else {
        await api.post('/admin/universities', trimmedValues);
        toast.success('University created successfully');
      }
      setShowModal(false);
      setEditingUniversity(null);
      form.resetFields();
      loadUniversities();
    } catch (error: any) {
      console.error('[UNIVERSITIES] Submit error:', error);
      console.error('[UNIVERSITIES] Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to save university');
    }
  };

  const handleEdit = (university: University) => {
    setEditingUniversity(university);
    // Extract countryId from country object if it's an object, otherwise use countryId field
    const countryId = university.countryId || 
      (typeof university.country === 'object' && university.country !== null 
        ? university.country.id 
        : '');
    
    form.setFieldsValue({
      name: university.name,
      domain: university.domain || '',
      countryId: countryId,
      active: university.active,
      allowCrossCampus: university.allowCrossCampus,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/admin/universities/${id}`);
      toast.success('University deleted successfully');
      loadUniversities();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete university');
    }
  };

  const handleAdd = () => {
    setEditingUniversity(null);
    form.resetFields();
    form.setFieldsValue({
      active: true,
      allowCrossCampus: false,
    });
    setShowModal(true);
  };

  const columns: ColumnsType<University> = [
    {
      title: 'University Name',
      key: 'name',
      width: 300,
      render: (_, record) => (
        <Space>
          <BankOutlined style={{ color: '#2358d6', fontSize: '20px' }} />
          <div>
            <div className="font-medium text-gray-900">{record.name}</div>
            {record.domain && (
              <Text type="secondary" className="text-xs flex items-center">
                <GlobalOutlined className="mr-1" />
                {record.domain}
              </Text>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'Domain',
      dataIndex: 'domain',
      key: 'domain',
      render: (domain) => domain || <Text type="secondary">N/A</Text>,
    },
    {
      title: 'Country',
      dataIndex: 'country',
      key: 'country',
      render: (country) => {
        const countryName = typeof country === 'object' && country !== null ? country.name : country;
        return (
          <Tag color="blue" icon={<GlobalOutlined />}>
            {countryName || 'N/A'}
          </Tag>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'active',
      key: 'active',
      render: (active) => (
        <Tag color={active ? 'success' : 'error'} icon={active ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>
          {active ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Cross-Campus',
      dataIndex: 'allowCrossCampus',
      key: 'allowCrossCampus',
      render: (allowCrossCampus) => (
        <Tag color={allowCrossCampus ? 'blue' : 'default'}>
          {allowCrossCampus ? 'Enabled' : 'Disabled'}
        </Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => format(new Date(date), 'MMM dd, yyyy'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit university">
            <Button
              type="default"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              size="small"
            >
              Edit
            </Button>
          </Tooltip>
          <Popconfirm
            title="Delete this university?"
            description="This action cannot be undone."
            onConfirm={() => handleDelete(record.id)}
            okText="Yes, Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete university">
              <Button
                danger
                icon={<DeleteOutlined />}
                size="small"
              >
                Delete
              </Button>
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const activeCount = universities.filter((u) => u.active).length;
  const inactiveCount = universities.filter((u) => !u.active).length;
  const crossCampusCount = universities.filter((u) => u.allowCrossCampus).length;

  const stats = [
    {
      title: 'Total Universities',
      value: universities.length,
      icon: <BankOutlined />,
      color: '#2358d6',
    },
    {
      title: 'Active',
      value: activeCount,
      icon: <CheckCircleOutlined />,
      color: '#10b981',
    },
    {
      title: 'Inactive',
      value: inactiveCount,
      icon: <CloseCircleOutlined />,
      color: '#ef4444',
    },
    {
      title: 'Cross-Campus Enabled',
      value: crossCampusCount,
      icon: <TeamOutlined />,
      color: '#8b5cf6',
    },
  ];

  return (
    <ProtectedRoute requiredRole={['super_admin']}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <Title level={2} className="!mb-2 !text-gray-900">University Management</Title>
            <Text type="secondary">Manage universities and their settings</Text>
          </div>
          <Space>
            <Tooltip title="Refresh universities">
              <Button
                icon={<ReloadOutlined />}
                onClick={loadUniversities}
                loading={loading}
                size="large"
              >
                Refresh
              </Button>
            </Tooltip>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
              size="large"
            >
              Add University
            </Button>
          </Space>
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

        {/* Universities Table */}
        <Card className="shadow-md border-0">
          <Table
            columns={columns}
            dataSource={universities}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} universit${total !== 1 ? 'ies' : 'y'}`,
            }}
            locale={{
              emptyText: (
                <Empty
                  image={<BankOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
                  description="No universities found"
                />
              ),
            }}
            scroll={{ x: 1000 }}
          />
        </Card>

        {/* Add/Edit Modal */}
        <Modal
          title={
            <div className="flex items-center space-x-2">
              <BankOutlined className="text-blue-500" />
              <span>{editingUniversity ? 'Edit University' : 'Add University'}</span>
            </div>
          }
          open={showModal}
          onCancel={() => {
            setShowModal(false);
            setEditingUniversity(null);
            form.resetFields();
          }}
          footer={null}
          width={600}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            validateTrigger="onSubmit"
            initialValues={{
              active: true,
              allowCrossCampus: false,
            }}
          >
            <Form.Item
              name="name"
              label="University Name"
              rules={[{ required: true, message: 'Please enter university name' }]}
            >
              <Input placeholder="Enter university name" size="large" />
            </Form.Item>

            <Form.Item
              name="domain"
              label="Email Domain"
              validateTrigger="onSubmit"
              normalize={(value) => value?.trim()}
              rules={[
                { 
                  required: true,
                  message: 'Email domain is required for university validation' 
                },
                {
                  pattern: /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/,
                  message: 'Please enter a valid domain (e.g., example.edu, university.com)',
                },
              ]}
              help="This domain will be used to validate student emails (e.g., student@example.edu)"
            >
              <Input
                placeholder="example.edu"
                size="large"
                prefix={<GlobalOutlined className="text-gray-400" />}
                allowClear
              />
            </Form.Item>

            <Form.Item
              name="countryId"
              label="Country"
              rules={[{ required: true, message: 'Please select country' }]}
              help={
                availableCountries.length === 0
                  ? 'No active countries available. Please activate countries in the Countries page first.'
                  : 'Only active countries are shown. Manage countries in the Countries page.'
              }
            >
              <Select
                placeholder="Select country"
                size="large"
                showSearch
                filterOption={(input: string, option: any) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={availableCountries.map((country) => ({
                  label: country.name,
                  value: country.id,
                }))}
                disabled={availableCountries.length === 0}
              />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="active"
                  label="Status"
                  valuePropName="checked"
                >
                  <Switch
                    checkedChildren="Active"
                    unCheckedChildren="Inactive"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="allowCrossCampus"
                  label="Cross-Campus"
                  valuePropName="checked"
                >
                  <Switch
                    checkedChildren="Enabled"
                    unCheckedChildren="Disabled"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item className="mb-0 mt-6">
              <Space className="w-full justify-end">
                <Button
                  onClick={() => {
                    setShowModal(false);
                    setEditingUniversity(null);
                    form.resetFields();
                  }}
                >
                  Cancel
                </Button>
                <Button type="primary" htmlType="submit">
                  {editingUniversity ? 'Update' : 'Create'}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}

