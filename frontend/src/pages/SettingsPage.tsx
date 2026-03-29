import { Alert, Button, Card, Form, Input, List, Segmented, Space, Switch, Typography, message } from 'antd';
import { useEffect, useState } from 'react';

import { AuditLogItem, AuditLogSection, getAuditLogs, updateMyProfile } from '../api/auth';
import { extractApiErrorMessage } from '../api/error';
import { readAuth, updateStoredUser } from '../app/auth-storage';
import { readTheme, writeTheme } from '../app/theme';

export function SettingsPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>(readTheme());
  const [section, setSection] = useState<AuditLogSection>('USERS');
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form] = Form.useForm<{ email: string }>();
  const [messageApi, contextHolder] = message.useMessage();

  const auth = readAuth();

  useEffect(() => {
    writeTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (auth?.user?.email) {
      form.setFieldsValue({ email: auth.user.email });
    }
  }, [auth?.user?.email, form]);

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

  async function handleProfileSave(values: { email: string }) {
    try {
      setSavingProfile(true);
      setError(null);
      const updatedUser = await updateMyProfile(values.email);
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
        <Space>
          <Typography.Text>Тёмный режим</Typography.Text>
          <Switch checked={theme === 'dark'} onChange={(checked) => setTheme(checked ? 'dark' : 'light')} />
        </Space>
      </Card>

      <Card title="Мой профиль">
        <Form form={form} layout="vertical" onFinish={handleProfileSave}>
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
