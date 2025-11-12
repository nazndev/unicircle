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
  Row,
  Col,
  Divider,
  Tabs,
  Badge,
} from 'antd';
import {
  SettingOutlined,
  SaveOutlined,
  UserOutlined,
  MailOutlined,
  GlobalOutlined,
  ShopOutlined,
  HeartOutlined,
  TeamOutlined,
  FileTextOutlined,
  ExperimentOutlined,
  BankOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface ProfileFeatures {
  marketplace: boolean;
  career: boolean;
  crush?: boolean;
  circles?: boolean;
  network?: boolean;
  feed: boolean;
  // Note: research is NOT a profile feature - it's badge-based (teacher badge) and platform-level
}

interface BadgeSpace {
  enabled: boolean;
  name: string;
  description?: string;
  accessType?: 'student' | 'professional' | 'both'; // Which profile types can access this space
}

interface BadgeSpaces {
  [badgeType: string]: BadgeSpace;
}

interface Settings {
  enableCrossUniversityMatching: boolean;
  reportNotificationEmail: string;
  enableStudentRegistration?: boolean;
  enableProfessionalRegistration?: boolean;
  studentFeatures?: ProfileFeatures;
  professionalFeatures?: ProfileFeatures;
  badgeSpaces?: BadgeSpaces;
  minAgeStudent?: number | null;
  maxAgeStudent?: number | null;
  minAgeProfessional?: number | null;
  maxAgeProfessional?: number | null;
  termsMessage?: string | null;
  termsLink?: string | null;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    enableCrossUniversityMatching: false,
    reportNotificationEmail: '',
    enableStudentRegistration: true,
    enableProfessionalRegistration: true,
    studentFeatures: {
      marketplace: true,
      career: true,
      crush: true,
      circles: true,
      feed: true,
    },
    professionalFeatures: {
      marketplace: true,
      career: true,
      circles: true,
      feed: true,
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reloadingCache, setReloadingCache] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [badgeTypes, setBadgeTypes] = useState<any[]>([]);
  const [cacheStats, setCacheStats] = useState<any>(null);

  useEffect(() => {
    loadSettings();
    loadBadgeTypes();
    loadCacheStats();
  }, []);

  const loadCacheStats = async () => {
    try {
      const response = await api.get('/admin/cache/stats');
      const data = response.data?.data || response.data || {};
      setCacheStats(data);
    } catch (error) {
      console.error('Failed to load cache stats:', error);
    }
  };

  const handleReloadCache = async () => {
    setReloadingCache(true);
    try {
      const response = await api.post('/admin/cache/reload');
      const data = response.data?.data || response.data || {};
      toast.success('Cache reloaded successfully');
      await loadCacheStats();
    } catch (error: any) {
      console.error('[SETTINGS] Failed to reload cache:', error);
      toast.error(error.response?.data?.message || 'Failed to reload cache');
    } finally {
      setReloadingCache(false);
    }
  };

  const loadBadgeTypes = async () => {
    try {
      const response = await api.get('/badges/types');
      const data = response.data?.data || response.data || [];
      setBadgeTypes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load badge types:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await api.get('/admin/settings');
      let data = response.data;
      if (data?.data && typeof data.data === 'object' && 'success' in data.data) {
        data = data.data.data;
      } else if (data?.data && typeof data.data === 'object') {
        data = data.data;
      } else if (data?.success && data?.data) {
        data = data.data;
      }
      
      const defaultSettings = {
        enableCrossUniversityMatching: false,
        reportNotificationEmail: '',
        enableStudentRegistration: true,
        enableProfessionalRegistration: true,
        studentFeatures: {
          marketplace: true,
          career: true,
          crush: true,
          circles: true,
          feed: true,
        },
        professionalFeatures: {
          marketplace: true,
          career: true,
          circles: true,
          feed: true,
        },
        badgeFeatures: {},
      };
      
      const mergedSettings = {
        ...defaultSettings,
        ...data,
        enableCrossUniversityMatching: data?.enableCrossUniversityMatching !== undefined ? data.enableCrossUniversityMatching : defaultSettings.enableCrossUniversityMatching,
        reportNotificationEmail: data?.reportNotificationEmail || defaultSettings.reportNotificationEmail,
        enableStudentRegistration: data?.enableStudentRegistration !== undefined ? data.enableStudentRegistration : defaultSettings.enableStudentRegistration,
        enableProfessionalRegistration: data?.enableProfessionalRegistration !== undefined ? data.enableProfessionalRegistration : defaultSettings.enableProfessionalRegistration,
        studentFeatures: data?.studentFeatures || defaultSettings.studentFeatures,
        professionalFeatures: data?.professionalFeatures || defaultSettings.professionalFeatures,
        badgeFeatures: data?.badgeFeatures || defaultSettings.badgeFeatures,
        minAgeStudent: data?.minAgeStudent !== undefined ? data.minAgeStudent : null,
        maxAgeStudent: data?.maxAgeStudent !== undefined ? data.maxAgeStudent : null,
        minAgeProfessional: data?.minAgeProfessional !== undefined ? data.minAgeProfessional : null,
        maxAgeProfessional: data?.maxAgeProfessional !== undefined ? data.maxAgeProfessional : null,
        termsMessage: data?.termsMessage || null,
        termsLink: data?.termsLink || null,
      };
      
      setSettings(mergedSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const settingsPayload = {
        enableCrossUniversityMatching: settings.enableCrossUniversityMatching !== undefined ? Boolean(settings.enableCrossUniversityMatching) : false,
        reportNotificationEmail: settings.reportNotificationEmail || null,
        enableStudentRegistration: settings.enableStudentRegistration !== undefined ? Boolean(settings.enableStudentRegistration) : true,
        enableProfessionalRegistration: settings.enableProfessionalRegistration !== undefined ? Boolean(settings.enableProfessionalRegistration) : true,
        studentFeatures: settings.studentFeatures || null,
        professionalFeatures: settings.professionalFeatures || null,
        badgeSpaces: settings.badgeSpaces || null,
        minAgeStudent: settings.minAgeStudent !== undefined ? (settings.minAgeStudent === null ? null : Number(settings.minAgeStudent)) : null,
        maxAgeStudent: settings.maxAgeStudent !== undefined ? (settings.maxAgeStudent === null ? null : Number(settings.maxAgeStudent)) : null,
        minAgeProfessional: settings.minAgeProfessional !== undefined ? (settings.minAgeProfessional === null ? null : Number(settings.minAgeProfessional)) : null,
        maxAgeProfessional: settings.maxAgeProfessional !== undefined ? (settings.maxAgeProfessional === null ? null : Number(settings.maxAgeProfessional)) : null,
        termsMessage: settings.termsMessage || null,
        termsLink: settings.termsLink || null,
      };
      
      await api.put('/admin/settings', settingsPayload);
      toast.success('Settings saved successfully');
      await loadSettings();
      // Reload cache stats after saving
      await loadCacheStats();
    } catch (error: any) {
      console.error('[SETTINGS] Failed to save:', error);
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

  const FeatureToggle = ({ 
    label, 
    description, 
    checked, 
    onChange, 
    icon 
  }: { 
    label: string; 
    description?: string; 
    checked: boolean; 
    onChange: (checked: boolean) => void;
    icon?: React.ReactNode;
  }) => (
    <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {icon && <span className="text-blue-500">{icon}</span>}
            <Text strong className="text-base">{label}</Text>
          </div>
          {description && (
            <Text type="secondary" className="text-xs block mt-1">
              {description}
            </Text>
          )}
        </div>
        <Switch
          checked={checked}
          onChange={onChange}
          className="ml-4"
        />
      </div>
    </div>
  );

  return (
    <ProtectedRoute requiredRole={['super_admin']}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <Title level={2} className="!mb-2 !text-gray-900">Platform Settings</Title>
            <Text type="secondary">Configure platform-wide settings and feature availability</Text>
          </div>
          <Space>
            <Button
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saving}
              size="large"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleReloadCache}
              loading={reloadingCache}
              size="large"
            >
              {reloadingCache ? 'Reloading...' : 'Reload Cache'}
            </Button>
          </Space>
        </div>

        {/* Cache Stats Card */}
        {cacheStats && (
          <Card className="shadow-sm border-0 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center justify-between">
              <div>
                <Text strong className="text-gray-900 block mb-1">Cache Status</Text>
                <Space size="middle">
                  <Text type="secondary" className="text-sm">
                    Settings: {cacheStats.settingsCached ? '✓ Cached' : '✗ Not cached'}
                  </Text>
                  <Text type="secondary" className="text-sm">
                    User Features: {cacheStats.userFeaturesCount || 0} users cached
                  </Text>
                  {cacheStats.memoryUsage && (
                    <Text type="secondary" className="text-sm">
                      Memory: {cacheStats.memoryUsage}
                    </Text>
                  )}
                </Space>
              </div>
              <Button
                type="link"
                onClick={loadCacheStats}
                size="small"
              >
                Refresh Stats
              </Button>
            </div>
          </Card>
        )}

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          size="large"
          items={[
            {
              key: 'general',
              label: (
                <span>
                  <SettingOutlined className="mr-2" />
                  General
                </span>
              ),
              children: (
                <div className="space-y-6">
                  <Card className="shadow-sm border-0">
                    <Title level={4} className="!mb-6 flex items-center gap-2">
                      <GlobalOutlined className="text-blue-500" />
                      Platform Configuration
                    </Title>
                    <Space direction="vertical" size="large" className="w-full">
                      <FeatureToggle
                        label="Cross-University Matching"
                        description="Allow users to match and connect across different universities"
                        checked={settings.enableCrossUniversityMatching}
                        onChange={(checked) =>
                          setSettings({ ...settings, enableCrossUniversityMatching: checked })
                        }
                        icon={<GlobalOutlined />}
                      />
                    </Space>
                  </Card>

                  <Card className="shadow-sm border-0">
                    <Title level={4} className="!mb-6 flex items-center gap-2">
                      <UserOutlined className="text-purple-500" />
                      Account Registration
                    </Title>
                    <Row gutter={[16, 16]}>
                      <Col xs={24} md={12}>
                        <FeatureToggle
                          label="Student Registration"
                          description="Allow new student registrations via university email"
                          checked={settings.enableStudentRegistration !== undefined ? settings.enableStudentRegistration : true}
                          onChange={(checked) =>
                            setSettings({ ...settings, enableStudentRegistration: checked })
                          }
                          icon={<UserOutlined />}
                        />
                      </Col>
                      <Col xs={24} md={12}>
                        <FeatureToggle
                          label="Professional Registration"
                          description="Allow new professional registrations via organization email"
                          checked={settings.enableProfessionalRegistration !== undefined ? settings.enableProfessionalRegistration : true}
                          onChange={(checked) =>
                            setSettings({ ...settings, enableProfessionalRegistration: checked })
                          }
                          icon={<BankOutlined />}
                        />
                      </Col>
                    </Row>
                  </Card>

                  <Card className="shadow-sm border-0">
                    <Title level={4} className="!mb-6 flex items-center gap-2">
                      <MailOutlined className="text-green-500" />
                      Notifications
                    </Title>
                    <Form.Item label="Report Notification Email" className="!mb-0">
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
                      <Text type="secondary" className="text-xs mt-2 block">
                        Email address to receive report notifications
                      </Text>
                    </Form.Item>
                  </Card>

                  <Card className="shadow-sm border-0">
                    <Title level={4} className="!mb-6 flex items-center gap-2">
                      <UserOutlined className="text-orange-500" />
                      Age Restrictions
                    </Title>
                    <Row gutter={[16, 16]}>
                      <Col xs={24} md={12}>
                        <Form.Item label="Student Minimum Age">
                          <Input
                            type="number"
                            placeholder="e.g., 16"
                            value={settings.minAgeStudent?.toString() || ''}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                minAgeStudent: e.target.value ? parseInt(e.target.value) : null,
                              })
                            }
                            size="large"
                          />
                          <Text type="secondary" className="text-xs mt-1 block">
                            Leave empty for no minimum age
                          </Text>
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item label="Student Maximum Age">
                          <Input
                            type="number"
                            placeholder="e.g., 35"
                            value={settings.maxAgeStudent?.toString() || ''}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                maxAgeStudent: e.target.value ? parseInt(e.target.value) : null,
                              })
                            }
                            size="large"
                          />
                          <Text type="secondary" className="text-xs mt-1 block">
                            Leave empty for no maximum age
                          </Text>
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item label="Professional Minimum Age">
                          <Input
                            type="number"
                            placeholder="e.g., 18"
                            value={settings.minAgeProfessional?.toString() || ''}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                minAgeProfessional: e.target.value ? parseInt(e.target.value) : null,
                              })
                            }
                            size="large"
                          />
                          <Text type="secondary" className="text-xs mt-1 block">
                            Leave empty for no minimum age
                          </Text>
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item label="Professional Maximum Age">
                          <Input
                            type="number"
                            placeholder="e.g., 70"
                            value={settings.maxAgeProfessional?.toString() || ''}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                maxAgeProfessional: e.target.value ? parseInt(e.target.value) : null,
                              })
                            }
                            size="large"
                          />
                          <Text type="secondary" className="text-xs mt-1 block">
                            Leave empty for no maximum age
                          </Text>
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>

                  <Card className="shadow-sm border-0">
                    <Title level={4} className="!mb-6 flex items-center gap-2">
                      <FileTextOutlined className="text-blue-500" />
                      Terms and Conditions
                    </Title>
                    <Form.Item label="Terms Message">
                      <Input.TextArea
                        rows={4}
                        placeholder="Message to show when user clicks terms checkbox"
                        value={settings.termsMessage || ''}
                        onChange={(e) =>
                          setSettings({ ...settings, termsMessage: e.target.value || null })
                        }
                        size="large"
                      />
                      <Text type="secondary" className="text-xs mt-1 block">
                        This message will be displayed when users click the terms checkbox during registration
                      </Text>
                    </Form.Item>
                    <Form.Item label="Terms Link">
                      <Input
                        type="url"
                        placeholder="https://unicircle.pro/terms"
                        value={settings.termsLink || ''}
                        onChange={(e) =>
                          setSettings({ ...settings, termsLink: e.target.value || null })
                        }
                        size="large"
                      />
                      <Text type="secondary" className="text-xs mt-1 block">
                        Full URL where terms and conditions are displayed
                      </Text>
                    </Form.Item>
                  </Card>
                </div>
              ),
            },
            {
              key: 'student',
              label: (
                <span>
                  <UserOutlined className="mr-2" />
                  Student Features
                </span>
              ),
              children: (
                <Card className="shadow-sm border-0">
                  <Title level={4} className="!mb-6">Enable Features for Student Profile</Title>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} lg={8}>
                      <FeatureToggle
                        label="Marketplace"
                        description="Buy and sell items"
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
                        icon={<ShopOutlined />}
                      />
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                      <FeatureToggle
                        label="Career"
                        description="Job postings and applications"
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
                        icon={<BankOutlined />}
                      />
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                      <FeatureToggle
                        label="Crush Matching"
                        description="Anonymous crush matching"
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
                        icon={<HeartOutlined />}
                      />
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                      <FeatureToggle
                        label="Circles"
                        description="Join and create groups"
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
                        icon={<TeamOutlined />}
                      />
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                      <FeatureToggle
                        label="Feed"
                        description="Social feed and posts"
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
                        icon={<FileTextOutlined />}
                      />
                    </Col>
                  </Row>
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <Text type="secondary" className="text-xs">
                      <strong>Note:</strong> Research collaboration is controlled at platform level. Students can browse and apply to research opportunities published by teachers. 
                      Research publishing/managing is enabled for users with verified Teacher badge (see Badge Spaces tab). 
                      Students with Researcher badge can access Research Space.
                    </Text>
                  </div>
                </Card>
              ),
            },
            {
              key: 'professional',
              label: (
                <span>
                  <BankOutlined className="mr-2" />
                  Professional Features
                </span>
              ),
              children: (
                <Card className="shadow-sm border-0">
                  <Title level={4} className="!mb-6">Enable Features for Professional Profile</Title>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} lg={8}>
                      <FeatureToggle
                        label="Marketplace"
                        description="Buy and sell items"
                        checked={settings.professionalFeatures?.marketplace ?? true}
                        onChange={(checked) =>
                          setSettings({
                            ...settings,
                            professionalFeatures: {
                              ...settings.professionalFeatures,
                              marketplace: checked,
                            } as ProfileFeatures,
                          })
                        }
                        icon={<ShopOutlined />}
                      />
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                      <FeatureToggle
                        label="Career"
                        description="Job postings and applications"
                        checked={settings.professionalFeatures?.career ?? true}
                        onChange={(checked) =>
                          setSettings({
                            ...settings,
                            professionalFeatures: {
                              ...settings.professionalFeatures,
                              career: checked,
                            } as ProfileFeatures,
                          })
                        }
                        icon={<BankOutlined />}
                      />
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                      <FeatureToggle
                        label="Circles"
                        description="Join and create groups"
                        checked={settings.professionalFeatures?.circles ?? true}
                        onChange={(checked) =>
                          setSettings({
                            ...settings,
                            professionalFeatures: {
                              ...settings.professionalFeatures,
                              circles: checked,
                            } as ProfileFeatures,
                          })
                        }
                        icon={<TeamOutlined />}
                      />
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                      <FeatureToggle
                        label="Feed"
                        description="Social feed and posts"
                        checked={settings.professionalFeatures?.feed ?? true}
                        onChange={(checked) =>
                          setSettings({
                            ...settings,
                            professionalFeatures: {
                              ...settings.professionalFeatures,
                              feed: checked,
                            } as ProfileFeatures,
                          })
                        }
                        icon={<FileTextOutlined />}
                      />
                    </Col>
                  </Row>
                </Card>
              ),
            },
            {
              key: 'badges',
              label: (
                <span>
                  <TrophyOutlined className="mr-2" />
                  Badge Spaces
                </span>
              ),
              children: (
                <div className="space-y-6">
                  <Card className="shadow-sm border-0 bg-blue-50 border-blue-200">
                    <div className="p-4">
                      <Text strong className="text-blue-900 block mb-2">
                        How Badge Spaces Work
                      </Text>
                      <Text type="secondary" className="text-sm">
                        Badges enable <strong>Spaces</strong> - specialized communities where badge holders can connect, share stories, and collaborate. 
                        For example, users with a verified "Teacher" badge get access to the "Research Space" where they can connect with students who have the "Researcher" badge. 
                        Engineers get the "Engineering Space", Doctors get the "Doctor Space", etc. Each space is a dedicated community for that profession.
                      </Text>
                    </div>
                  </Card>

                  {badgeTypes.length === 0 ? (
                    <Card className="shadow-sm border-0">
                      <div className="text-center py-8">
                        <TrophyOutlined className="text-4xl text-gray-300 mb-4" />
                        <Text type="secondary">Loading badge types...</Text>
                      </div>
                    </Card>
                  ) : (
                    badgeTypes.map((badge) => {
                      const badgeType = badge.type || badge;
                      const badgeName = badge.name || badgeType;
                      
                      // Get default space name based on badge type
                      const getDefaultSpaceName = (type: string) => {
                        const spaceNames: { [key: string]: string } = {
                          teacher: 'Research Space',
                          engineer: 'Engineering Space',
                          doctor: 'Doctor Space',
                          lawyer: 'Legal Space',
                          architect: 'Architecture Space',
                          chartered_accountant: 'Accounting Space',
                          pharmacist: 'Pharmacy Space',
                          dentist: 'Dental Space',
                          veterinarian: 'Veterinary Space',
                          nurse: 'Nursing Space',
                          psychologist: 'Psychology Space',
                          researcher: 'Research Space',
                          graduate_teacher: 'Graduate Teaching Space',
                          intern: 'Intern Space',
                          teaching_assistant: 'Teaching Assistant Space',
                          research_assistant: 'Research Assistant Space',
                        };
                        return spaceNames[type] || `${badgeName} Space`;
                      };

                      const getDefaultDescription = (type: string) => {
                        const descriptions: { [key: string]: string } = {
                          teacher: 'Connect with teachers and researchers for collaboration',
                          engineer: 'Share engineering stories, projects, and insights',
                          doctor: 'Medical discussions, case studies, and professional networking',
                          researcher: 'Research collaboration and academic discussions',
                        };
                        return descriptions[type] || `Professional community for ${badgeName}s`;
                      };

                      // Determine default access type based on badge type
                      const getDefaultAccessType = (type: string): 'student' | 'professional' | 'both' => {
                        // Student-specific badges
                        const studentBadges = ['researcher', 'intern', 'teaching_assistant', 'research_assistant', 'graduate_teacher'];
                        // Professional-specific badges
                        const professionalBadges = ['engineer', 'doctor', 'lawyer', 'architect', 'chartered_accountant', 'pharmacist', 'dentist', 'veterinarian', 'nurse', 'psychologist', 'consultant', 'designer', 'developer', 'analyst'];
                        // Shared badges (can be student or professional)
                        const sharedBadges = ['teacher'];
                        
                        if (studentBadges.includes(type)) return 'student';
                        if (professionalBadges.includes(type)) return 'professional';
                        if (sharedBadges.includes(type)) return 'both';
                        return 'both'; // Default to both if unknown
                      };

                      const badgeSpace = settings.badgeSpaces?.[badgeType] || {
                        enabled: badgeType === 'teacher', // Teacher space enabled by default
                        name: getDefaultSpaceName(badgeType),
                        description: getDefaultDescription(badgeType),
                        accessType: getDefaultAccessType(badgeType),
                      };

                      return (
                        <Card
                          key={badgeType}
                          className="shadow-sm border-0"
                          title={
                            <div className="flex items-center gap-2">
                              <TrophyOutlined className="text-yellow-500" />
                              <span>{badgeName}</span>
                              {badge.description && (
                                <Text type="secondary" className="text-xs font-normal">
                                  ({badge.description})
                                </Text>
                              )}
                            </div>
                          }
                        >
                          <div className="space-y-4">
                            <div>
                              <Text type="secondary" className="text-xs block mb-2">
                                Enable a dedicated space for users with the verified <strong>{badgeName}</strong> badge.
                                In this space, badge holders can connect, share stories, post discussions, and collaborate.
                              </Text>
                            </div>
                            
                            <div>
                              <Text strong className="block mb-2">Space Enabled</Text>
                              <Switch
                                checked={badgeSpace.enabled ?? false}
                                onChange={(checked) =>
                                  setSettings({
                                    ...settings,
                                    badgeSpaces: {
                                      ...settings.badgeSpaces,
                                      [badgeType]: {
                                        ...badgeSpace,
                                        enabled: checked,
                                      },
                                    },
                                  })
                                }
                              />
                            </div>

                            {badgeSpace.enabled && (
                              <>
                                <div>
                                  <Text strong className="block mb-2">Space Name</Text>
                                  <Input
                                    value={badgeSpace.name || getDefaultSpaceName(badgeType)}
                                    onChange={(e) =>
                                      setSettings({
                                        ...settings,
                                        badgeSpaces: {
                                          ...settings.badgeSpaces,
                                          [badgeType]: {
                                            ...badgeSpace,
                                            name: e.target.value,
                                          },
                                        },
                                      })
                                    }
                                    placeholder={getDefaultSpaceName(badgeType)}
                                  />
                                </div>
                                <div>
                                  <Text strong className="block mb-2">Space Description</Text>
                                  <Input.TextArea
                                    rows={3}
                                    value={badgeSpace.description || getDefaultDescription(badgeType)}
                                    onChange={(e) =>
                                      setSettings({
                                        ...settings,
                                        badgeSpaces: {
                                          ...settings.badgeSpaces,
                                          [badgeType]: {
                                            ...badgeSpace,
                                            description: e.target.value,
                                          },
                                        },
                                      })
                                    }
                                    placeholder={getDefaultDescription(badgeType)}
                                  />
                                </div>
                                <div>
                                  <Text strong className="block mb-2">Access Type</Text>
                                  <Text type="secondary" className="text-xs block mb-2">
                                    Which profile types can access this space?
                                  </Text>
                                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                    <Button
                                      type={badgeSpace.accessType === 'student' ? 'primary' : 'default'}
                                      onClick={() =>
                                        setSettings({
                                          ...settings,
                                          badgeSpaces: {
                                            ...settings.badgeSpaces,
                                            [badgeType]: {
                                              ...badgeSpace,
                                              accessType: 'student',
                                            },
                                          },
                                        })
                                      }
                                      block
                                    >
                                      Student Only
                                    </Button>
                                    <Button
                                      type={badgeSpace.accessType === 'professional' ? 'primary' : 'default'}
                                      onClick={() =>
                                        setSettings({
                                          ...settings,
                                          badgeSpaces: {
                                            ...settings.badgeSpaces,
                                            [badgeType]: {
                                              ...badgeSpace,
                                              accessType: 'professional',
                                            },
                                          },
                                        })
                                      }
                                      block
                                    >
                                      Professional Only
                                    </Button>
                                    <Button
                                      type={badgeSpace.accessType === 'both' ? 'primary' : 'default'}
                                      onClick={() =>
                                        setSettings({
                                          ...settings,
                                          badgeSpaces: {
                                            ...settings.badgeSpaces,
                                            [badgeType]: {
                                              ...badgeSpace,
                                              accessType: 'both',
                                            },
                                          },
                                        })
                                      }
                                      block
                                    >
                                      Both (Student & Professional)
                                    </Button>
                                  </Space>
                                  <Text type="secondary" className="text-xs block mt-2">
                                    {badgeSpace.accessType === 'student' && 'Only users with student profile can access this space'}
                                    {badgeSpace.accessType === 'professional' && 'Only users with professional profile can access this space'}
                                    {badgeSpace.accessType === 'both' && 'Both student and professional profiles can access this space'}
                                  </Text>
                                </div>
                              </>
                            )}
                          </div>
                        </Card>
                      );
                    })
                  )}
                </div>
              ),
            },
          ]}
        />

      </div>
    </ProtectedRoute>
  );
}
