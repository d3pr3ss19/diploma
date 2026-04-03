import { Alert, Button, Card, Form, Input, Slider, Space, Switch, Typography, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import { updateMyProfile } from '../api/auth';
import { extractApiErrorMessage } from '../api/error';
import { applyAccessibilityPrefs, readAccessibilityPrefs, writeAccessibilityPrefs } from '../app/accessibility';
import { readAuth, updateStoredUser } from '../app/auth-storage';
import { readTheme, writeTheme } from '../app/theme';

type ProfileForm = { email: string; fullName: string };

export function SettingsPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>(readTheme());
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState(readAccessibilityPrefs());
  const [form] = Form.useForm<ProfileForm>();
  const [messageApi, contextHolder] = message.useMessage();

  const canSpeech = useMemo(() => 'speechSynthesis' in window, []);
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

          <Space direction="vertical" style={{ width: 380 }}>
            <Space style={{ justifyContent: 'space-between', width: '100%' }}>
              <Typography.Text>Экранная лупа</Typography.Text>
              <Switch checked={prefs.magnifierEnabled} onChange={(checked) => setPrefs((prev) => ({ ...prev, magnifierEnabled: checked }))} />
            </Space>
            <Slider
              min={100}
              max={200}
              step={5}
              disabled={!prefs.magnifierEnabled}
              value={Math.round(prefs.magnifierScale * 100)}
              onChange={(value) => setPrefs((prev) => ({ ...prev, magnifierScale: Number(value) / 100 }))}
            />
          </Space>

          <Space>
            <Typography.Text>Озвучка при наведении</Typography.Text>
            <Switch
              disabled={!canSpeech}
              checked={prefs.speechOnHover}
              onChange={(checked) => setPrefs((prev) => ({ ...prev, speechOnHover: checked }))}
            />
          </Space>

          {!canSpeech ? (
            <Typography.Text type="secondary">Браузер не поддерживает Web Speech API, озвучка недоступна.</Typography.Text>
          ) : null}

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
    </Space>
  );
}
