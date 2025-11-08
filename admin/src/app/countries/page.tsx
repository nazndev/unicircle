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
  Switch,
  Input,
  Modal,
  Form,
  Popconfirm,
} from 'antd';
import toast from 'react-hot-toast';
import {
  GlobalOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

interface Country {
  id: string;
  name: string;
  code: string | null;
  active: boolean;
  _count?: {
    universities: number;
  };
  createdAt: string;
}

export default function CountriesPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadCountries();
  }, []);

  const loadCountries = async () => {
    setLoading(true);
    try {
      const response = await api.get('/country?activeOnly=false');
      console.log('[COUNTRIES] API Response:', response);
      // Handle nested response structure: response.data.data.data or response.data.data
      const data = response.data?.data?.data || response.data?.data || response.data;
      console.log('[COUNTRIES] Extracted data:', data);
      const countriesArray = Array.isArray(data) ? data : [];
      console.log('[COUNTRIES] Countries array length:', countriesArray.length);
      setCountries(countriesArray);
      if (countriesArray.length === 0) {
        console.warn('[COUNTRIES] No countries found in response');
      }
    } catch (error: any) {
      console.error('[COUNTRIES] Failed to load countries:', error);
      console.error('[COUNTRIES] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      toast.error(error.response?.data?.message || 'Failed to load countries');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingCountry) {
        await api.put(`/country/${editingCountry.id}`, values);
        toast.success('Country updated successfully');
      } else {
        await api.post('/country', values);
        toast.success('Country created successfully');
      }
      setShowModal(false);
      setEditingCountry(null);
      form.resetFields();
      loadCountries();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save country');
    }
  };

  const handleEdit = (country: Country) => {
    setEditingCountry(country);
    form.setFieldsValue({
      name: country.name,
      code: country.code,
      active: country.active,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/country/${id}`);
      toast.success('Country deleted successfully');
      loadCountries();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete country');
    }
  };

  const handleToggleActive = async (country: Country) => {
    try {
      await api.put(`/country/${country.id}/active`, { active: !country.active });
      toast.success(`Country ${!country.active ? 'activated' : 'deactivated'} successfully`);
      loadCountries();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update country status');
    }
  };

  const handleAdd = () => {
    setEditingCountry(null);
    form.resetFields();
    setShowModal(true);
  };

  const filteredCountries = countries.filter((country) =>
    country.name.toLowerCase().includes(searchText.toLowerCase()) ||
    country.code?.toLowerCase().includes(searchText.toLowerCase())
  );

  const activeCount = countries.filter((c) => c.active).length;
  const inactiveCount = countries.filter((c) => !c.active).length;

  const columns: ColumnsType<Country> = [
    {
      title: 'Country Name',
      key: 'name',
      width: 250,
      render: (_, record) => (
        <Space>
          <GlobalOutlined style={{ color: '#2358d6', fontSize: '20px' }} />
          <div>
            <div className="font-medium text-gray-900">{record.name}</div>
            {record.code && (
              <Text type="secondary" className="text-xs">
                {record.code}
              </Text>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      render: (code) => code || <Text type="secondary">N/A</Text>,
    },
    {
      title: 'Universities',
      key: 'universities',
      width: 120,
      render: (_, record) => (
        <Text>{record._count?.universities || 0}</Text>
      ),
    },
    {
      title: 'Status',
      key: 'active',
      width: 120,
      render: (_, record) => (
        <Tag color={record.active ? 'green' : 'default'}>
          {record.active ? (
            <>
              <CheckCircleOutlined /> Active
            </>
          ) : (
            <>
              <CloseCircleOutlined /> Inactive
            </>
          )}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space>
          <Switch
            checked={record.active}
            onChange={() => handleToggleActive(record)}
            size="small"
          />
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete country"
            description="Are you sure? This will fail if there are universities associated with this country."
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              size="small"
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <ProtectedRoute requiredRole={['super_admin']}>
      <div className="p-6">
        <div className="mb-6">
          <Title level={2}>Country Management</Title>
          <Text type="secondary">
            Manage countries and their active status. Only active countries are available for registration.
          </Text>
        </div>

        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{countries.length}</div>
              <div className="text-sm text-gray-600 mt-1">Total Countries</div>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{activeCount}</div>
              <div className="text-sm text-gray-600 mt-1">Active Countries</div>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-400">{inactiveCount}</div>
              <div className="text-sm text-gray-600 mt-1">Inactive Countries</div>
            </div>
          </Card>
        </div>

        <Card>
          <div className="mb-4 flex justify-between items-center">
            <Input.Search
              placeholder="Search countries..."
              style={{ width: 300 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              Add Country
            </Button>
          </div>

          <Table
            columns={columns}
            dataSource={filteredCountries}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} countries`,
            }}
          />
        </Card>

        <Modal
          title={editingCountry ? 'Edit Country' : 'Add Country'}
          open={showModal}
          onCancel={() => {
            setShowModal(false);
            setEditingCountry(null);
            form.resetFields();
          }}
          onOk={() => form.submit()}
          width={500}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Form.Item
              name="name"
              label="Country Name"
              rules={[{ required: true, message: 'Please enter country name' }]}
            >
              <Input
                placeholder="e.g., United States, Bangladesh"
                size="large"
                prefix={<GlobalOutlined className="text-gray-400" />}
              />
            </Form.Item>

            <Form.Item
              name="code"
              label="ISO Code (Optional)"
              rules={[
                { len: 2, message: 'ISO code must be 2 characters' },
              ]}
            >
              <Input
                placeholder="e.g., US, BD, GB"
                size="large"
                maxLength={2}
                style={{ textTransform: 'uppercase' }}
              />
            </Form.Item>

            <Form.Item
              name="active"
              label="Status"
              valuePropName="checked"
              initialValue={false}
            >
              <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}

