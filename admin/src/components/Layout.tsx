'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Layout as AntLayout, Menu, Avatar, Dropdown, Button, Space, Badge, Typography, Divider, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import Image from 'next/image';
import {
  DashboardOutlined,
  UserOutlined,
  FileTextOutlined,
  BankOutlined,
  MessageOutlined,
  ShoppingOutlined,
  FlagOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';

const { Header, Sider, Content, Footer } = AntLayout;
const { Text } = Typography;

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, hasPermission } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  const navigationItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
      roles: ['super_admin', 'admin', 'moderator'],
    },
    {
      key: '/users',
      icon: <UserOutlined />,
      label: 'Users',
      roles: ['super_admin', 'admin'],
    },
    {
      key: '/alumni',
      icon: <FileTextOutlined />,
      label: 'Alumni Approvals',
      roles: ['super_admin', 'admin'],
    },
    {
      key: '/universities',
      icon: <BankOutlined />,
      label: 'Universities',
      roles: ['super_admin'],
    },
    {
      key: '/posts',
      icon: <MessageOutlined />,
      label: 'Posts',
      roles: ['super_admin', 'admin', 'moderator'],
    },
    {
      key: '/marketplace',
      icon: <ShoppingOutlined />,
      label: 'Marketplace',
      roles: ['super_admin', 'admin', 'moderator'],
    },
    {
      key: '/reports',
      icon: <FlagOutlined />,
      label: 'Reports',
      roles: ['super_admin', 'admin', 'moderator'],
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      roles: ['super_admin'],
    },
  ];

  const filteredNav: MenuProps['items'] = navigationItems
    .filter(item => hasPermission(item.roles as any))
    .map(({ roles, ...item }) => item);

  const handleMenuClick = ({ key }: { key: string }) => {
    router.push(key);
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      label: (
        <div className="px-2 py-1">
          <div className="font-medium">{user?.name || 'Admin User'}</div>
          <Text type="secondary" className="text-xs">{user?.email}</Text>
        </div>
      ),
      disabled: true,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout,
      danger: true,
    },
  ];

  return (
    <AntLayout className="min-h-screen bg-gray-50">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={280}
        collapsedWidth={80}
        theme="dark"
        className="!fixed left-0 top-0 bottom-0 h-screen shadow-xl z-10 transition-all duration-300"
        style={{
          background: 'linear-gradient(180deg, #2358d6 0%, #1e4db8 100%)',
        }}
      >
        {/* Sidebar Header */}
        <div className="h-20 flex items-center justify-center px-4 border-b transition-all duration-300" style={{ borderColor: 'rgba(35, 88, 214, 0.3)', backgroundColor: 'rgba(35, 88, 214, 0.2)' }}>
          {!collapsed ? (
            <div className="flex items-center space-x-4 w-full">
              <div className="relative h-12 w-12 rounded-xl overflow-hidden flex-shrink-0 bg-white shadow-lg flex items-center justify-center p-1.5">
                <Image 
                  src="/icon.png" 
                  alt="UniCircle" 
                  width={40}
                  height={40}
                  className="object-contain"
                  unoptimized
                />
              </div>
              <div className="flex flex-col justify-center flex-1 min-w-0">
                <div className="font-bold text-lg leading-tight" style={{ color: '#ffffff' }}>UniCircle</div>
                <div className="text-xs font-medium leading-tight mt-0.5 opacity-90" style={{ color: '#ffffff' }}>Admin Portal</div>
              </div>
            </div>
          ) : (
            <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-white shadow-lg flex items-center justify-center p-1.5 transition-transform duration-300">
              <Image 
                src="/icon.png" 
                alt="UniCircle" 
                width={40}
                height={40}
                className="object-contain"
                unoptimized
              />
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto py-4 px-2">
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[pathname]}
            items={filteredNav}
            onClick={handleMenuClick}
            className="border-r-0 bg-transparent"
            style={{
              background: 'transparent',
            }}
            inlineCollapsed={collapsed}
          />
        </div>
      </Sider>

      {/* Main Layout */}
      <AntLayout className={`transition-all duration-300 ease-in-out ${collapsed ? 'ml-[80px]' : 'ml-[280px]'}`}>
        {/* Top Header */}
        <Header 
          className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center justify-between sticky top-0 z-10"
          style={{ padding: '0 24px' }}
        >
          <div className="flex items-center space-x-4 flex-1">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="text-lg hover:bg-gray-100 rounded-lg transition-colors"
              style={{ fontSize: '18px', width: '40px', height: '40px' }}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            />
            <div className="hidden md:block flex-1">
              <Text className="text-gray-400 text-sm">Welcome back,</Text>
              <Text className="text-gray-900 font-semibold ml-2">
                {user?.name || user?.email?.split('@')[0] || 'Admin'}
              </Text>
            </div>
          </div>

          <Space size="middle">
            <Tooltip title="Search">
              <Button
                type="text"
                icon={<SearchOutlined />}
                className="hidden md:flex items-center"
                shape="circle"
              />
            </Tooltip>
            <Tooltip title="Notifications">
              <Badge count={0} showZero={false}>
                <Button
                  type="text"
                  icon={<BellOutlined />}
                  className="flex items-center"
                  shape="circle"
                />
              </Badge>
            </Tooltip>
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
              <Space className="cursor-pointer hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors">
                <Badge dot color="#10b981" offset={[-2, 2]}>
                  <Avatar 
                    size="default"
                    icon={<UserOutlined />}
                    style={{ backgroundColor: '#2358d6' }}
                  />
                </Badge>
                <div className="hidden lg:block text-left">
                  <div className="text-sm font-semibold text-gray-900">
                    {user?.name || user?.email?.split('@')[0] || 'Admin'}
                  </div>
                  <div className="text-xs text-gray-500 capitalize">
                    {user?.role?.replace('_', ' ') || 'Administrator'}
                  </div>
                </div>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        {/* Main Content */}
        <Content className="bg-gray-50 min-h-[calc(100vh-112px)]">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </div>
        </Content>

        {/* Footer */}
        <Footer className="bg-white border-t border-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between space-y-2 md:space-y-0">
              <div className="flex items-center space-x-4">
                <Text type="secondary" className="text-sm">
                  © {new Date().getFullYear()} UniCircle. All rights reserved.
                </Text>
                <Divider type="vertical" className="h-4" />
                <Text type="secondary" className="text-sm">
                  Admin Portal v1.0
                </Text>
              </div>
              <div className="flex items-center space-x-4">
                <Text type="secondary" className="text-xs">
                  Powered by UniCircle Platform
                </Text>
              </div>
            </div>
          </div>
        </Footer>
      </AntLayout>
    </AntLayout>
  );
}
