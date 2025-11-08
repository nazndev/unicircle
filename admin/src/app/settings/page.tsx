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
  Space,
  Tag,
  Row,
  Col,
  Divider,
  Select,
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
} from '@ant-design/icons';
import toast from 'react-hot-toast';

const { Title, Text } = Typography;

interface ProfileFeatures {
  marketplace: boolean;
  career: boolean;
  crush?: boolean;
  circles?: boolean;
  network?: boolean;
  feed: boolean;
  research?: boolean;
}

interface Settings {
  enableCrossUniversityMatching: boolean;
  reportNotificationEmail: string;
  enableStudentRegistration?: boolean;
  enableAlumniRegistration?: boolean;
  enableTeacherRegistration?: boolean;
  studentFeatures?: ProfileFeatures;
  alumniFeatures?: ProfileFeatures;
  teacherFeatures?: ProfileFeatures;
}

const { Option } = Select;

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    enableCrossUniversityMatching: false,
    reportNotificationEmail: '',
    enableStudentRegistration: true,
    enableAlumniRegistration: true,
    enableTeacherRegistration: true,
    studentFeatures: {
      marketplace: true,
      career: true,
      crush: true,
      circles: true,
      feed: true,
    },
    alumniFeatures: {
      marketplace: true,
      career: true,
      circles: true,
      feed: true,
    },
    teacherFeatures: {
      marketplace: true,
      career: true,
      circles: true,
      feed: true,
      research: true,
    },
  });
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get('/admin/settings');
      console.log('[SETTINGS] Full response:', response.data);
      
      // Handle nested response structure: { success: true, data: {...} } or { data: { success: true, data: {...} } }
      let data = response.data;
      if (data?.data && typeof data.data === 'object' && 'success' in data.data) {
        // Double nested: { data: { success: true, data: {...} } }
        data = data.data.data;
      } else if (data?.data && typeof data.data === 'object') {
        // Single nested: { data: {...} }
        data = data.data;
      } else if (data?.success && data?.data) {
        // { success: true, data: {...} }
        data = data.data;
      }
      
      console.log('[SETTINGS] Extracted data:', data);
      console.log('[SETTINGS] Account type flags:', {
        student: data?.enableStudentRegistration,
        alumni: data?.enableAlumniRegistration,
        teacher: data?.enableTeacherRegistration,
      });
      
      const defaultSettings = {
        enableCrossUniversityMatching: false,
        reportNotificationEmail: '',
        enableStudentRegistration: true,
        enableAlumniRegistration: true,
        enableTeacherRegistration: true,
        studentFeatures: {
          marketplace: true,
          career: true,
          crush: true,
          circles: true,
          feed: true,
        },
        alumniFeatures: {
          marketplace: true,
          career: true,
          circles: true,
          feed: true,
        },
        teacherFeatures: {
          marketplace: true,
          career: true,
          circles: true,
          feed: true,
          research: true,
        },
      };
      
      // Merge with defaults, but preserve false values explicitly
      const mergedSettings = {
        ...defaultSettings,
        ...data,
        enableCrossUniversityMatching: data?.enableCrossUniversityMatching !== undefined ? data.enableCrossUniversityMatching : defaultSettings.enableCrossUniversityMatching,
        reportNotificationEmail: data?.reportNotificationEmail || defaultSettings.reportNotificationEmail,
        enableStudentRegistration: data?.enableStudentRegistration !== undefined ? data.enableStudentRegistration : defaultSettings.enableStudentRegistration,
        enableAlumniRegistration: data?.enableAlumniRegistration !== undefined ? data.enableAlumniRegistration : defaultSettings.enableAlumniRegistration,
        enableTeacherRegistration: data?.enableTeacherRegistration !== undefined ? data.enableTeacherRegistration : defaultSettings.enableTeacherRegistration,
        studentFeatures: data?.studentFeatures || defaultSettings.studentFeatures,
        alumniFeatures: data?.alumniFeatures || defaultSettings.alumniFeatures,
        teacherFeatures: data?.teacherFeatures || defaultSettings.teacherFeatures,
      };
      
      console.log('[SETTINGS] Merged settings:', mergedSettings);
      setSettings(mergedSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableCountries = async () => {
    setLoadingCountries(true);
    try {
      const response = await api.get('/university/countries');
      const data = response.data?.data || response.data || [];
      setAvailableCountries(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load countries:', error);
      toast.error('Failed to load available countries');
    } finally {
      setLoadingCountries(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Prepare settings payload - use current state values directly
      // Ensure all boolean values are explicitly set (not undefined)
      // IMPORTANT: Check for undefined explicitly, not using ?? which treats false as falsy
      const settingsPayload = {
        enableCrossUniversityMatching: settings.enableCrossUniversityMatching !== undefined ? Boolean(settings.enableCrossUniversityMatching) : false,
        reportNotificationEmail: settings.reportNotificationEmail || null,
        // Explicitly check for undefined to preserve false values
        enableStudentRegistration: settings.enableStudentRegistration !== undefined ? Boolean(settings.enableStudentRegistration) : true,
        enableAlumniRegistration: settings.enableAlumniRegistration !== undefined ? Boolean(settings.enableAlumniRegistration) : true,
        enableTeacherRegistration: settings.enableTeacherRegistration !== undefined ? Boolean(settings.enableTeacherRegistration) : true,
        studentFeatures: settings.studentFeatures || null,
        alumniFeatures: settings.alumniFeatures || null,
        teacherFeatures: settings.teacherFeatures || null,
      };
      
      console.log('[SETTINGS] Local settings state before save:', {
        enableTeacherRegistration: settings.enableTeacherRegistration,
        type: typeof settings.enableTeacherRegistration,
      });
      console.log('[SETTINGS] Saving settings payload:', settingsPayload);
      console.log('[SETTINGS] Teacher registration in payload:', settingsPayload.enableTeacherRegistration, typeof settingsPayload.enableTeacherRegistration);
      
      const response = await api.put('/admin/settings', settingsPayload);
      console.log('[SETTINGS] Save response:', response.data);
      
      // Extract the updated settings from response
      let responseData = response.data?.data || response.data;
      if (responseData?.data && typeof responseData.data === 'object') {
        responseData = responseData.data;
      } else if (responseData?.success && responseData?.data) {
        responseData = responseData.data;
      }
      
      console.log('[SETTINGS] Updated settings from response:', responseData);
      console.log('[SETTINGS] Teacher registration after save:', responseData?.enableTeacherRegistration);
      
      toast.success('Settings saved successfully');
      // Reload settings to get the updated values
      await loadSettings();
    } catch (error: any) {
      console.error('[SETTINGS] Failed to save:', error);
      console.error('[SETTINGS] Error response:', error.response?.data);
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

  return (
    <ProtectedRoute requiredRole={['super_admin']}>
      <div className="space-y-6">
        {/* Page Header with Save Button */}
        <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-200 sticky top-0 z-10">
          <div>
            <Title level={2} className="!mb-2 !text-gray-900">Platform Settings</Title>
            <Text type="secondary">Manage platform configuration and feature settings</Text>
          </div>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
            size="large"
            className="min-w-[140px]"
          >
            {saving ? 'Saving...' : 'Save All Settings'}
          </Button>
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

                <Form.Item label="Account Type Availability">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Text strong>Student Registration</Text>
                        <div>
                          <Text type="secondary" className="text-xs">
                            Allow new student registrations via university email
                          </Text>
                        </div>
                      </div>
                      <Switch
                        checked={settings.enableStudentRegistration !== undefined ? settings.enableStudentRegistration : true}
                        onChange={(checked) =>
                          setSettings({ ...settings, enableStudentRegistration: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Text strong>Alumni Registration</Text>
                        <div>
                          <Text type="secondary" className="text-xs">
                            Allow new alumni registrations with verification documents
                          </Text>
                        </div>
                      </div>
                      <Switch
                        checked={settings.enableAlumniRegistration !== undefined ? settings.enableAlumniRegistration : true}
                        onChange={(checked) =>
                          setSettings({ ...settings, enableAlumniRegistration: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Text strong>Teacher Registration</Text>
                        <div>
                          <Text type="secondary" className="text-xs">
                            Allow new teacher registrations (university email or documents)
                          </Text>
                        </div>
                      </div>
                      <Switch
                        checked={settings.enableTeacherRegistration !== undefined ? settings.enableTeacherRegistration : true}
                        onChange={(checked) => {
                          console.log('[SETTINGS] Teacher registration toggle:', checked);
                          setSettings({ ...settings, enableTeacherRegistration: checked });
                        }}
                      />
                    </div>
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
              </Form>
            </Card>

            {/* Profile-Wise Features Card */}
            <Card
              title={
                <div className="flex items-center space-x-2">
                  <UserOutlined className="text-purple-500" />
                  <span>Profile-Wise Features</span>
                </div>
              }
              className="shadow-md border-0 mt-6"
            >
              <Form layout="vertical" className="space-y-6">
                {/* Student Features */}
                <div>
                  <Title level={4} className="!mb-4">Student Features</Title>
                  <Space direction="vertical" className="w-full" size="middle">
                    <div className="flex items-center justify-between">
                      <Text>Marketplace</Text>
                      <Switch
                        checked={settings.studentFeatures?.marketplace ?? true}
                        onChange={(checked) =>
                          setSettings({
                            ...settings,
                            studentFeatures: {
                              ...settings.studentFeatures,
                              marketplace: checked,
                            } as ProfileFeatures,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Text>Career Features</Text>
                      <Switch
                        checked={settings.studentFeatures?.career ?? true}
                        onChange={(checked) =>
                          setSettings({
                            ...settings,
                            studentFeatures: {
                              ...settings.studentFeatures,
                              career: checked,
                            } as ProfileFeatures,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Text>Crush Matching</Text>
                      <Switch
                        checked={settings.studentFeatures?.crush ?? true}
                        onChange={(checked) =>
                          setSettings({
                            ...settings,
                            studentFeatures: {
                              ...settings.studentFeatures,
                              crush: checked,
                            } as ProfileFeatures,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Text>Circles</Text>
                      <Switch
                        checked={settings.studentFeatures?.circles ?? true}
                        onChange={(checked) =>
                          setSettings({
                            ...settings,
                            studentFeatures: {
                              ...settings.studentFeatures,
                              circles: checked,
                            } as ProfileFeatures,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Text>Feed</Text>
                      <Switch
                        checked={settings.studentFeatures?.feed ?? true}
                        onChange={(checked) =>
                          setSettings({
                            ...settings,
                            studentFeatures: {
                              ...settings.studentFeatures,
                              feed: checked,
                            } as ProfileFeatures,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Text>Research Collaboration</Text>
                      <Switch
                        checked={settings.studentFeatures?.research ?? true}
                        onChange={(checked) =>
                          setSettings({
                            ...settings,
                            studentFeatures: {
                              ...settings.studentFeatures,
                              research: checked,
                            } as ProfileFeatures,
                          })
                        }
                      />
                    </div>
                  </Space>
                </div>

                <Divider />

                {/* Alumni Features */}
                <div>
                  <Title level={4} className="!mb-4">Alumni Features</Title>
                  <Space direction="vertical" className="w-full" size="middle">
                    <div className="flex items-center justify-between">
                      <Text>Marketplace</Text>
                      <Switch
                        checked={settings.alumniFeatures?.marketplace ?? true}
                        onChange={(checked) =>
                          setSettings({
                            ...settings,
                            alumniFeatures: {
                              ...settings.alumniFeatures,
                              marketplace: checked,
                            } as ProfileFeatures,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Text>Career Features</Text>
                      <Switch
                        checked={settings.alumniFeatures?.career ?? true}
                        onChange={(checked) =>
                          setSettings({
                            ...settings,
                            alumniFeatures: {
                              ...settings.alumniFeatures,
                              career: checked,
                            } as ProfileFeatures,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Text>Circles</Text>
                      <Switch
                        checked={settings.alumniFeatures?.circles ?? true}
                        onChange={(checked) =>
                          setSettings({
                            ...settings,
                            alumniFeatures: {
                              ...settings.alumniFeatures,
                              circles: checked,
                            } as ProfileFeatures,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Text>Feed</Text>
                      <Switch
                        checked={settings.alumniFeatures?.feed ?? true}
                        onChange={(checked) =>
                          setSettings({
                            ...settings,
                            alumniFeatures: {
                              ...settings.alumniFeatures,
                              feed: checked,
                            } as ProfileFeatures,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Text>Research Collaboration</Text>
                      <Switch
                        checked={settings.alumniFeatures?.research ?? true}
                        onChange={(checked) =>
                          setSettings({
                            ...settings,
                            alumniFeatures: {
                              ...settings.alumniFeatures,
                              research: checked,
                            } as ProfileFeatures,
                          })
                        }
                      />
                    </div>
                  </Space>
                </div>

                <Divider />

                {/* Teacher Features */}
                <div>
                  <Title level={4} className="!mb-4">Teacher Features</Title>
                  <Space direction="vertical" className="w-full" size="middle">
                    <div className="flex items-center justify-between">
                      <Text>Marketplace</Text>
                      <Switch
                        checked={settings.teacherFeatures?.marketplace ?? true}
                        onChange={(checked) =>
                          setSettings({
                            ...settings,
                            teacherFeatures: {
                              ...settings.teacherFeatures,
                              marketplace: checked,
                            } as ProfileFeatures,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Text>Career Features</Text>
                      <Switch
                        checked={settings.teacherFeatures?.career ?? true}
                        onChange={(checked) =>
                          setSettings({
                            ...settings,
                            teacherFeatures: {
                              ...settings.teacherFeatures,
                              career: checked,
                            } as ProfileFeatures,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Text>Circles</Text>
                      <Switch
                        checked={settings.teacherFeatures?.circles ?? true}
                        onChange={(checked) =>
                          setSettings({
                            ...settings,
                            teacherFeatures: {
                              ...settings.teacherFeatures,
                              circles: checked,
                            } as ProfileFeatures,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Text>Feed</Text>
                      <Switch
                        checked={settings.teacherFeatures?.feed ?? true}
                        onChange={(checked) =>
                          setSettings({
                            ...settings,
                            teacherFeatures: {
                              ...settings.teacherFeatures,
                              feed: checked,
                            } as ProfileFeatures,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Text>Research Collaboration</Text>
                      <Switch
                        checked={settings.teacherFeatures?.research ?? true}
                        onChange={(checked) =>
                          setSettings({
                            ...settings,
                            teacherFeatures: {
                              ...settings.teacherFeatures,
                              research: checked,
                            } as ProfileFeatures,
                          })
                        }
                      />
                    </div>
                  </Space>
                </div>
              </Form>
            </Card>
          </Col>
        </Row>
      </div>
    </ProtectedRoute>
  );
}

