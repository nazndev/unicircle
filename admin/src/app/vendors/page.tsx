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
  Typography,
  Spin,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Modal,
  Form,
  message,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ShopOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const { Title, Text } = Typography;
const { Option } = Select;

interface VendorData {
  id: string;
  businessName: string;
  proprietorName: string;
  email: string;
  phone: string;
  status: string;
  createdAt: string;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<VendorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    suspended: 0,
  });
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<VendorData | null>(null);
  const [form] = Form.useForm();

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/vendors');
      const data = response.data;
      setVendors(data);
      
      // Calculate stats
      setStats({
        total: data.length,
        pending: data.filter((v: VendorData) => v.status === 'pending').length,
        approved: data.filter((v: VendorData) => v.status === 'approved').length,
        rejected: data.filter((v: VendorData) => v.status === 'rejected').length,
        suspended: data.filter((v: VendorData) => v.status === 'suspended').length,
      });
    } catch (error: any) {
      console.error('Failed to fetch vendors:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch vendors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleApprove = async () => {
    if (!selectedVendor) return;
    
    try {
      await api.post(`/admin/vendors/${selectedVendor.id}/approve`);
      toast.success('Vendor approved successfully');
      setApproveModalVisible(false);
      setSelectedVendor(null);
      fetchVendors();
    } catch (error: any) {
      console.error('Failed to approve vendor:', error);
      toast.error(error.response?.data?.message || 'Failed to approve vendor');
    }
  };

  const handleReject = async (values: { reason?: string }) => {
    if (!selectedVendor) return;
    
    try {
      await api.post(`/admin/vendors/${selectedVendor.id}/reject`, {
        reason: values.reason,
      });
      toast.success('Vendor rejected');
      setRejectModalVisible(false);
      setSelectedVendor(null);
      form.resetFields();
      fetchVendors();
    } catch (error: any) {
      console.error('Failed to reject vendor:', error);
      toast.error(error.response?.data?.message || 'Failed to reject vendor');
    }
  };

  const handleSuspend = async (vendorId: string, reason?: string) => {
    try {
      await api.put(`/admin/vendors/${vendorId}/suspend`, { reason });
      toast.success('Vendor suspended');
      fetchVendors();
    } catch (error: any) {
      console.error('Failed to suspend vendor:', error);
      toast.error(error.response?.data?.message || 'Failed to suspend vendor');
    }
  };

  const getStatusTag = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      pending: { color: 'orange', icon: <ClockCircleOutlined /> },
      approved: { color: 'green', icon: <CheckCircleOutlined /> },
      rejected: { color: 'red', icon: <CloseCircleOutlined /> },
      suspended: { color: 'red', icon: <CloseCircleOutlined /> },
    };

    const config = statusConfig[status] || { color: 'default', icon: null };
    return (
      <Tag color={config.color} icon={config.icon}>
        {status.toUpperCase()}
      </Tag>
    );
  };

  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch =
      vendor.businessName.toLowerCase().includes(searchText.toLowerCase()) ||
      vendor.email.toLowerCase().includes(searchText.toLowerCase()) ||
      vendor.phone.includes(searchText);
    const matchesStatus = statusFilter === 'all' || vendor.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns: ColumnsType<VendorData> = [
    {
      title: 'Business Name',
      dataIndex: 'businessName',
      key: 'businessName',
      sorter: (a, b) => a.businessName.localeCompare(b.businessName),
    },
    {
      title: 'Proprietor',
      dataIndex: 'proprietorName',
      key: 'proprietorName',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status),
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
      render: (_, record) => (
        <Space>
          {record.status === 'pending' && (
            <>
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => {
                  setSelectedVendor(record);
                  setApproveModalVisible(true);
                }}
              >
                Approve
              </Button>
              <Button
                danger
                size="small"
                icon={<CloseCircleOutlined />}
                onClick={() => {
                  setSelectedVendor(record);
                  setRejectModalVisible(true);
                }}
              >
                Reject
              </Button>
            </>
          )}
          {record.status === 'approved' && (
            <Popconfirm
              title="Suspend vendor?"
              description="This will prevent the vendor from receiving new orders."
              onConfirm={() => handleSuspend(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button danger size="small">
                Suspend
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <ProtectedRoute>
      <div style={{ padding: '24px' }}>
        <Title level={2}>
          <ShopOutlined /> Vendor Management
        </Title>

        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Vendors"
                value={stats.total}
                prefix={<ShopOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Pending"
                value={stats.pending}
                valueStyle={{ color: '#faad14' }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Approved"
                value={stats.approved}
                valueStyle={{ color: '#3f8600' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Rejected/Suspended"
                value={stats.rejected + stats.suspended}
                valueStyle={{ color: '#cf1322' }}
                prefix={<CloseCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>

        <Card>
          <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
            <Space>
              <Input
                placeholder="Search vendors..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 300 }}
              />
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 150 }}
              >
                <Option value="all">All Status</Option>
                <Option value="pending">Pending</Option>
                <Option value="approved">Approved</Option>
                <Option value="rejected">Rejected</Option>
                <Option value="suspended">Suspended</Option>
              </Select>
            </Space>
            <Button icon={<ReloadOutlined />} onClick={fetchVendors}>
              Refresh
            </Button>
          </Space>

          <Table
            columns={columns}
            dataSource={filteredVendors}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 20 }}
          />
        </Card>

        <Modal
          title="Approve Vendor"
          open={approveModalVisible}
          onOk={handleApprove}
          onCancel={() => {
            setApproveModalVisible(false);
            setSelectedVendor(null);
          }}
          okText="Approve"
          cancelText="Cancel"
        >
          <p>Are you sure you want to approve <strong>{selectedVendor?.businessName}</strong>?</p>
        </Modal>

        <Modal
          title="Reject Vendor"
          open={rejectModalVisible}
          onOk={() => form.submit()}
          onCancel={() => {
            setRejectModalVisible(false);
            setSelectedVendor(null);
            form.resetFields();
          }}
          okText="Reject"
          cancelText="Cancel"
        >
          <Form form={form} onFinish={handleReject} layout="vertical">
            <Form.Item
              name="reason"
              label="Rejection Reason (optional)"
            >
              <Input.TextArea rows={4} placeholder="Enter reason for rejection..." />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}

