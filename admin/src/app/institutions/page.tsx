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
  Tabs,
  Radio,
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
  BuildOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface Institution {
  id: string;
  name: string;
  domain: string | null;
  country: string | { id: string; name: string; code: string | null };
  countryId?: string;
  active: boolean;
  type: 'university' | 'organization';
  // University-specific
  allowCrossCampus?: boolean;
  // Organization-specific
  organizationType?: string | null; // corporate, ngo, government, startup
  website?: string | null;
  description?: string | null;
  createdAt: string;
}

export default function InstitutionsPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null);
  const [form] = Form.useForm();
  const [availableCountries, setAvailableCountries] = useState<Array<{ id: string; name: string; code: string | null }>>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'university' | 'organization'>('all');

  useEffect(() => {
    loadInstitutions();
    loadAvailableCountries();
  }, []);

  const loadAvailableCountries = async () => {
    try {
      const response = await api.get('/country/active');
      const data = response.data?.data?.data || response.data?.data || response.data || [];
      const countriesArray = Array.isArray(data) ? data : [];
      setAvailableCountries(countriesArray);
    } catch (error) {
      console.error('[INSTITUTIONS] Failed to load available countries:', error);
    }
  };

  const loadInstitutions = async () => {
    setLoading(true);
    try {
      // Load both universities and organizations
      const [universitiesRes, organizationsRes] = await Promise.all([
        api.get('/admin/universities'),
        api.get('/admin/organizations'),
      ]);

      const universities = (universitiesRes.data?.data || universitiesRes.data || []).map((u: any) => ({
        ...u,
        type: 'university' as const,
      }));

      const organizations = (organizationsRes.data?.data || organizationsRes.data || []).map((o: any) => ({
        ...o,
        type: 'organization' as const,
      }));

      setInstitutions([...universities, ...organizations]);
    } catch (error) {
      console.error('Failed to load institutions:', error);
      toast.error('Failed to load institutions');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      const trimmedValues = {
        ...values,
        name: values.name?.trim(),
        domain: values.domain?.trim() || null,
        countryId: values.countryId,
        active: values.active !== undefined ? values.active : true,
      };

      if (values.type === 'university') {
        trimmedValues.allowCrossCampus = values.allowCrossCampus || false;
        // Remove organization-specific fields
        delete trimmedValues.organizationType;
        delete trimmedValues.website;
        delete trimmedValues.description;
      } else {
        // organization
        trimmedValues.organizationType = values.organizationType || null;
        trimmedValues.website = values.website?.trim() || null;
        trimmedValues.description = values.description?.trim() || null;
        // Remove university-specific fields
        delete trimmedValues.allowCrossCampus;
      }

      if (editingInstitution) {
        if (editingInstitution.type === 'university') {
          await api.put(`/admin/universities/${editingInstitution.id}`, trimmedValues);
        } else {
          await api.put(`/admin/organizations/${editingInstitution.id}`, trimmedValues);
        }
        toast.success('Institution updated successfully');
      } else {
        if (values.type === 'university') {
          await api.post('/admin/universities', trimmedValues);
        } else {
          await api.post('/admin/organizations', trimmedValues);
        }
        toast.success('Institution created successfully');
      }
      setShowModal(false);
      setEditingInstitution(null);
      form.resetFields();
      loadInstitutions();
    } catch (error: any) {
      console.error('[INSTITUTIONS] Submit error:', error);
      toast.error(error.response?.data?.message || 'Failed to save institution');
    }
  };

  const handleEdit = (institution: Institution) => {
    setEditingInstitution(institution);
    const countryId = institution.countryId ||
      (typeof institution.country === 'object' && institution.country !== null
        ? institution.country.id
        : '');

    const formValues: any = {
      type: institution.type,
      name: institution.name,
      domain: institution.domain || '',
      countryId: countryId,
      active: institution.active,
    };

    if (institution.type === 'university') {
      formValues.allowCrossCampus = institution.allowCrossCampus || false;
    } else {
      formValues.organizationType = institution.organizationType || undefined;
      formValues.website = institution.website || '';
      formValues.description = institution.description || '';
    }

    form.setFieldsValue(formValues);
    setShowModal(true);
  };

  const handleDelete = async (institution: Institution) => {
    try {
      if (institution.type === 'university') {
        await api.delete(`/admin/universities/${institution.id}`);
      } else {
        await api.delete(`/admin/organizations/${institution.id}`);
      }
      toast.success('Institution deleted successfully');
      loadInstitutions();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete institution');
    }
  };

  const handleAdd = () => {
    setEditingInstitution(null);
    form.resetFields();
    form.setFieldsValue({
      type: 'university',
      active: true,
      allowCrossCampus: false,
    });
    setShowModal(true);
  };

  const filteredInstitutions = institutions.filter((inst) => {
    if (activeTab === 'all') return true;
    return inst.type === activeTab;
  });

  const stats = {
    total: institutions.length,
    universities: institutions.filter((i) => i.type === 'university').length,
    organizations: institutions.filter((i) => i.type === 'organization').length,
    active: institutions.filter((i) => i.active).length,
  };

  const columns: ColumnsType<Institution> = [
    {
      title: 'Institution',
      key: 'name',
      width: 300,
      render: (_, record) => (
        <Space>
          {record.type === 'university' ? (
            <BankOutlined style={{ color: '#2358d6', fontSize: '20px' }} />
          ) : (
            <BuildOutlined style={{ color: '#722ed1', fontSize: '20px' }} />
          )}
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
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => (
        <Tag color={type === 'university' ? 'blue' : 'purple'} className="capitalize">
          {type}
        </Tag>
      ),
      filters: [
        { text: 'University', value: 'university' },
        { text: 'Organization', value: 'organization' },
      ],
      onFilter: (value, record) => record.type === value,
    },
    {
      title: 'Country',
      dataIndex: 'country',
      key: 'country',
      render: (country) => {
        const countryName = typeof country === 'object' && country !== null ? country.name : country;
        return (
          <Space>
            <GlobalOutlined />
            <Text>{countryName || 'N/A'}</Text>
          </Space>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'active',
      key: 'active',
      width: 100,
      render: (active: boolean) => (
        <Tag color={active ? 'success' : 'default'} icon={active ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>
          {active ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) => (
        <Text type="secondary" className="text-xs">
          {format(new Date(date), 'MMM d, yyyy')}
        </Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="Edit">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title={`Are you sure you want to delete this ${record.type}?`}
            onConfirm={() => handleDelete(record)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete">
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <ProtectedRoute requiredRole={['super_admin']}>
        <div className="flex flex-col items-center justify-center h-96">
          <Spin size="large" />
          <Text type="secondary" className="mt-4">Loading institutions...</Text>
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
            <Title level={2} className="!mb-2 !text-gray-900">Institutions</Title>
            <Text type="secondary">Manage universities and organizations</Text>
          </div>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadInstitutions}
            >
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              Add Institution
            </Button>
          </Space>
        </div>

        {/* Statistics */}
        <Row gutter={16}>
          <Col xs={24} sm={12} md={6}>
            <Card className="shadow-sm border-0">
              <Statistic
                title="Total Institutions"
                value={stats.total}
                prefix={<TeamOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="shadow-sm border-0">
              <Statistic
                title="Universities"
                value={stats.universities}
                prefix={<BankOutlined />}
                valueStyle={{ color: '#2358d6' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="shadow-sm border-0">
              <Statistic
                title="Organizations"
                value={stats.organizations}
                prefix={<BuildOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="shadow-sm border-0">
              <Statistic
                title="Active"
                value={stats.active}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Institutions Table */}
        <Card className="shadow-sm border-0">
          <div className="mb-4">
            <Radio.Group
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value="all">All ({stats.total})</Radio.Button>
              <Radio.Button value="university">Universities ({stats.universities})</Radio.Button>
              <Radio.Button value="organization">Organizations ({stats.organizations})</Radio.Button>
            </Radio.Group>
          </div>

          {filteredInstitutions.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={`No ${activeTab === 'all' ? 'institutions' : activeTab + 's'} found`}
            />
          ) : (
            <Table
              columns={columns}
              dataSource={filteredInstitutions}
              rowKey="id"
              pagination={{ pageSize: 20 }}
              scroll={{ x: 'max-content' }}
            />
          )}
        </Card>

        {/* Add/Edit Modal */}
        <Modal
          title={editingInstitution ? `Edit ${editingInstitution.type === 'university' ? 'University' : 'Organization'}` : 'Add Institution'}
          open={showModal}
          onCancel={() => {
            setShowModal(false);
            setEditingInstitution(null);
            form.resetFields();
          }}
          footer={null}
          width={700}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              type: 'university',
              active: true,
            }}
          >
            <Form.Item
              name="type"
              label="Institution Type"
              rules={[{ required: true, message: 'Please select institution type' }]}
            >
              <Select
                disabled={!!editingInstitution}
                onChange={(value) => {
                  form.setFieldsValue({
                    allowCrossCampus: value === 'university' ? false : undefined,
                    organizationType: value === 'organization' ? undefined : null,
                  });
                }}
              >
                <Option value="university">University</Option>
                <Option value="organization">Organization</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="name"
              label="Name"
              rules={[{ required: true, message: 'Please enter institution name' }]}
            >
              <Input placeholder="e.g., North South University" size="large" />
            </Form.Item>

            <Form.Item
              name="domain"
              label="Email Domain"
              rules={[
                { required: true, message: 'Please enter email domain' },
                { pattern: /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, message: 'Invalid domain format' },
              ]}
              tooltip="Email domain for validation (e.g., northsouth.edu)"
            >
              <Input placeholder="e.g., northsouth.edu" size="large" />
            </Form.Item>

            <Form.Item
              name="countryId"
              label="Country"
              rules={[{ required: true, message: 'Please select a country' }]}
            >
              <Select
                placeholder="Select country"
                size="large"
                showSearch
                filterOption={(input, option) =>
                  String(option?.label || option?.children || '').toLowerCase().includes(input.toLowerCase())
                }
              >
                {availableCountries.map((country) => (
                  <Option key={country.id} value={country.id}>
                    {country.name} {country.code && `(${country.code})`}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="active" valuePropName="checked">
              <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
            </Form.Item>

            {/* University-specific fields */}
            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) => prevValues.type !== currentValues.type}
            >
              {({ getFieldValue }) =>
                getFieldValue('type') === 'university' ? (
                  <Form.Item name="allowCrossCampus" valuePropName="checked">
                    <Switch checkedChildren="Allow Cross-Campus" unCheckedChildren="Same Campus Only" />
                  </Form.Item>
                ) : null
              }
            </Form.Item>

            {/* Organization-specific fields */}
            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) => prevValues.type !== currentValues.type}
            >
              {({ getFieldValue }) =>
                getFieldValue('type') === 'organization' ? (
                  <>
                    <Form.Item name="organizationType" label="Organization Type">
                      <Select placeholder="Select type" size="large">
                        <Option value="corporate">Corporate</Option>
                        <Option value="ngo">NGO</Option>
                        <Option value="government">Government</Option>
                        <Option value="startup">Startup</Option>
                      </Select>
                    </Form.Item>
                    <Form.Item name="website" label="Website">
                      <Input placeholder="https://example.com" size="large" />
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                      <TextArea rows={3} placeholder="Brief description of the organization" />
                    </Form.Item>
                  </>
                ) : null
              }
            </Form.Item>

            <Form.Item className="!mb-0">
              <Space>
                <Button type="primary" htmlType="submit">
                  {editingInstitution ? 'Update' : 'Create'}
                </Button>
                <Button onClick={() => {
                  setShowModal(false);
                  setEditingInstitution(null);
                  form.resetFields();
                }}>
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}

