import { Alert, Button, Card, Form, Input, List, Segmented, Space, Switch, Typography, message } from 'antd';
import { useEffect, useState } from 'react';

import { AuditLogItem, AuditLogSection, getAuditLogs, updateMyProfile } from '../api/auth';
import { extractApiErrorMessage } from '../api/error';
import { applyAccessibilityPrefs, readAccessibilityPrefs, writeAccessibilityPrefs } from '../app/accessibility';
import { readAuth, updateStoredUser } from '../app/auth-storage';
import { readTheme, writeTheme } from '../app/theme';

type ProfileForm = { email: string; fullName: string };

export function SettingsPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>(readTheme());
  const [section, setSection] = useState<AuditLogSection>('USERS');
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState(readAccessibilityPrefs());
  const [form] = Form.useForm<ProfileForm>();
  const [messageApi, contextHolder] = message.useMessage();

  const auth = readAuth();

  useEffect(() => {
    writeTheme(theme);
  }, [theme]);

  useEffect(() => {
    applyAccessibilityPrefs(prefs);
    writeAccessibilityPrefs(prefs);
  }, [prefs]);

  useEffect(() => {
    form.setFieldsValue({
      email: auth?.user?.email ?? '',
      fullName: auth?.user?.fullName ?? '',
    });
  }, [auth?.user?.email, auth?.user?.fullName, form]);

  useEffect(() => {
    async function loadLogs() {
      try {
        setLoadingLogs(true);
        setError(null);
        const data = await getAuditLogs(section);
        setLogs(data);
      } catch (err) {
        setError(extractApiErrorMessage(err, 'Не удалось загрузить аудит-логи.'));
      } finally {
        setLoadingLogs(false);
      }
    }

    void loadLogs();
  }, [section]);

  async function handleProfileSave(values: ProfileForm) {
    try {
      setSavingProfile(true);
      setError(null);
      const updatedUser = await updateMyProfile(values.email, values.fullName);
      updateStoredUser(updatedUser);
      messageApi.success('Профиль обновлён');
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Не удалось обновить профиль.'));
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {contextHolder}
      <Typography.Title level={3} style={{ margin: 0 }}>Настройки</Typography.Title>

      {error ? <Alert type="error" showIcon message={error} /> : null}

      <Card title="Доступность и интерфейс">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space>
            <Typography.Text>Тёмный режим</Typography.Text>
            <Switch checked={theme === 'dark'} onChange={(checked) => setTheme(checked ? 'dark' : 'light')} />
          </Space>
          <Space>
            <Typography.Text>Высокий контраст</Typography.Text>
            <Switch checked={prefs.highContrast} onChange={(checked) => setPrefs((prev) => ({ ...prev, highContrast: checked }))} />
          </Space>
          <Space>
            <Typography.Text>Увеличенный текст</Typography.Text>
            <Switch checked={prefs.largeText} onChange={(checked) => setPrefs((prev) => ({ ...prev, largeText: checked }))} />
          </Space>
          <Space>
            <Typography.Text>Уменьшение анимаций</Typography.Text>
            <Switch checked={prefs.reducedMotion} onChange={(checked) => setPrefs((prev) => ({ ...prev, reducedMotion: checked }))} />
          </Space>
        </Space>
      </Card>

      <Card title="Мой профиль">
        <Form form={form} layout="vertical" onFinish={handleProfileSave}>
          <Form.Item label="ФИО" name="fullName" rules={[{ required: true, min: 5, message: 'Минимум 5 символов' }]}> 
            <Input />
          </Form.Item>
          <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email', message: 'Введите корректный email' }]}> 
            <Input />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={savingProfile}>Сохранить профиль</Button>
        </Form>
      </Card>

      <Card title="Аудит-логи">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Segmented
            block
            value={section}
            onChange={(value) => setSection(value as AuditLogSection)}
            options={[
              { label: 'Пользователи', value: 'USERS' },
              { label: 'Абоненты', value: 'SUBSCRIBERS' },
              { label: 'Заявки', value: 'REQUESTS' },
            ]}
          />
          <List
            loading={loadingLogs}
            dataSource={logs}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  title={`${item.action} · ${new Date(item.createdAt).toLocaleString('ru-RU')}`}
                  description={`Кто: ${item.actorUser?.email ?? 'Система'} → Кому: ${item.targetUser?.email ?? '—'}`}
                />
              </List.Item>
            )}
          />
        </Space>
      </Card>
    </Space>
  );
}
