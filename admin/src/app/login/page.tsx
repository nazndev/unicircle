'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Input, Button, Card, Typography, Space } from 'antd';
import { UserOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons';
import Image from 'next/image';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const { Title, Text } = Typography;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleSubmit = async (values: { email: string; password: string }) => {
    console.log('[LOGIN PAGE] Form submitted:', { 
      email: values.email, 
      passwordLength: values.password?.length 
    });
    setLoading(true);

    try {
      console.log('[LOGIN PAGE] Calling login function...');
      await login(values.email, values.password);
      console.log('[LOGIN PAGE] Login successful, redirecting...');
      toast.success('Login successful');
      router.push('/dashboard');
    } catch (err: any) {
      console.error('[LOGIN PAGE] Login error:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        fullError: err
      });
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="w-full max-w-md px-4">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-600 rounded-2xl blur-xl opacity-20"></div>
              <div className="relative h-20 w-20 rounded-2xl shadow-lg overflow-hidden bg-white">
                <Image 
                  src="/icon.png" 
                  alt="UniCircle" 
                  width={80}
                  height={80}
                  className="object-contain"
                  priority
                  unoptimized
                />
              </div>
            </div>
          </div>
          <Title level={2} className="!mb-2">UniCircle Admin</Title>
          <Text type="secondary">Sign in to access the admin dashboard</Text>
        </div>

        {/* Login Card */}
        <Card className="shadow-xl border-0">
          <Form
            form={form}
            name="login"
            onFinish={handleSubmit}
            layout="vertical"
            size="large"
            autoComplete="off"
          >
            <Form.Item
              name="email"
              label="Email Address"
              rules={[
                { required: true, message: 'Please input your email!' },
                { type: 'email', message: 'Please enter a valid email!' },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="admin@unicircle.app"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: 'Please input your password!' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Enter your password"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                className="h-11"
              >
                Sign In
              </Button>
            </Form.Item>
          </Form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <Space className="w-full justify-center">
              <SafetyOutlined className="text-gray-400" />
              <Text type="secondary" className="text-xs">
                Secure admin access • UniCircle Platform
              </Text>
            </Space>
          </div>
        </Card>
      </div>
    </div>
  );
}
