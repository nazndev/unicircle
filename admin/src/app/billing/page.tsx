'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/lib/api';
import {
  Table,
  Card,
  Typography,
  Spin,
  Row,
  Col,
  Statistic,
  Tag,
  Space,
  DatePicker,
  Select,
} from 'antd';
import {
  DollarOutlined,
  ShoppingOutlined,
  FileTextOutlined,
  TrendingUpOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface InvoiceData {
  id: string;
  userId: string;
  amount: number;
  status: string;
  dueDate: string;
  paidAt: string | null;
  createdAt: string;
  user?: {
    name: string;
    email: string;
  };
}

interface AnalyticsData {
  totalRevenue: number;
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  gmv: number;
  platformFees: number;
  arpu: number;
  cac: number;
}

export default function BillingPage() {
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [window, setWindow] = useState('quarter');

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/billing/invoices');
      setInvoices(response.data);
    } catch (error: any) {
      console.error('Failed to fetch invoices:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const response = await api.get('/admin/billing/analytics');
      setAnalytics(response.data);
    } catch (error: any) {
      console.error('Failed to fetch analytics:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchROI = async () => {
    try {
      setAnalyticsLoading(true);
      const response = await api.get(`/admin/metrics/roi?window=${window}`);
      const roi = response.data;
      
      // Merge ROI data with analytics
      setAnalytics((prev) => ({
        ...prev!,
        gmv: roi.marketplace.gmv,
        platformFees: roi.marketplace.takeRate,
        arpu: roi.marketplace.arpu,
        cac: roi.acquisition.cac,
      }));
    } catch (error: any) {
      console.error('Failed to fetch ROI metrics:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch ROI metrics');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchAnalytics();
  }, []);

  useEffect(() => {
    if (analytics) {
      fetchROI();
    }
  }, [window]);

  const getStatusTag = (status: string) => {
    const statusConfig: Record<string, { color: string }> = {
      paid: { color: 'green' },
      pending: { color: 'orange' },
      overdue: { color: 'red' },
    };

    const config = statusConfig[status] || { color: 'default' };
    return <Tag color={config.color}>{status.toUpperCase()}</Tag>;
  };

  const columns: ColumnsType<InvoiceData> = [
    {
      title: 'Invoice ID',
      dataIndex: 'id',
      key: 'id',
      render: (id) => <Text code>{id.slice(0, 8)}...</Text>,
    },
    {
      title: 'User',
      key: 'user',
      render: (_, record) => (
        <Space>
          <Text strong>{record.user?.name || 'N/A'}</Text>
          <Text type="secondary">{record.user?.email}</Text>
        </Space>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => `$${amount.toFixed(2)}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status),
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date) => format(new Date(date), 'MMM dd, yyyy'),
    },
    {
      title: 'Paid At',
      dataIndex: 'paidAt',
      key: 'paidAt',
      render: (date) => (date ? format(new Date(date), 'MMM dd, yyyy') : '-'),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => format(new Date(date), 'MMM dd, yyyy'),
    },
  ];

  return (
    <ProtectedRoute>
      <div style={{ padding: '24px' }}>
        <Title level={2}>
          <DollarOutlined /> Billing & Analytics
        </Title>

        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Revenue"
                value={analytics?.totalRevenue || 0}
                prefix={<DollarOutlined />}
                precision={2}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="GMV"
                value={analytics?.gmv || 0}
                prefix={<ShoppingOutlined />}
                precision={2}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Platform Fees"
                value={analytics?.platformFees || 0}
                prefix={<DollarOutlined />}
                precision={2}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="ARPU"
                value={analytics?.arpu || 0}
                prefix={<TrendingUpOutlined />}
                precision={2}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="CAC"
                value={analytics?.cac || 0}
                prefix={<TrendingUpOutlined />}
                precision={2}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Invoices"
                value={analytics?.totalInvoices || 0}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Paid"
                value={analytics?.paidInvoices || 0}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Pending/Overdue"
                value={(analytics?.pendingInvoices || 0) + (analytics?.overdueInvoices || 0)}
                valueStyle={{ color: '#cf1322' }}
              />
            </Card>
          </Col>
        </Row>

        <Card
          title="ROI Metrics"
          extra={
            <Select value={window} onChange={setWindow} style={{ width: 120 }}>
              <Option value="month">Month</Option>
              <Option value="quarter">Quarter</Option>
              <Option value="year">Year</Option>
            </Select>
          }
          loading={analyticsLoading}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Statistic
                title="Customer Acquisition Cost (CAC)"
                value={analytics?.cac || 0}
                precision={2}
                prefix="$"
              />
            </Col>
            <Col span={12}>
              <Statistic
                title="Average Revenue Per User (ARPU)"
                value={analytics?.arpu || 0}
                precision={2}
                prefix="$"
              />
            </Col>
          </Row>
        </Card>

        <Card title="Invoices" style={{ marginTop: 24 }}>
          <Table
            columns={columns}
            dataSource={invoices}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 20 }}
          />
        </Card>
      </div>
    </ProtectedRoute>
  );
}

