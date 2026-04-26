import { Alert, Button, Card, Form, Input, Modal, Space, Typography, message } from 'antd';
import { useEffect, useState } from 'react';

import { updateMyProfile } from '../api/auth';
import { extractApiErrorMessage } from '../api/error';
import { readAuth, updateStoredUser } from '../app/auth-storage';

type ProfileForm = { email: string; fullName: string; region?: string };

export function ProfilePage() {
  const auth = readAuth();
  const [form] = Form.useForm<ProfileForm>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    form.setFieldsValue({
      email: auth?.user.email ?? '',
      fullName: auth?.user.fullName ?? '',
      region: auth?.user.region ?? '',
    });
  }, [auth?.user.email, auth?.user.fullName, auth?.user.region, form]);

  async function handleSubmit(values: ProfileForm) {
    const previousRegion = auth?.user.region ?? '';
    const nextRegion = values.region ?? '';

    const submit = async () => {
      try {
        setSaving(true);
        setError(null);
        const updated = await updateMyProfile(values.email, values.fullName, values.region);
        updateStoredUser(updated);
        messageApi.success('Профиль обновлен');
      } catch (err) {
        setError(extractApiErrorMessage(err, 'Не удалось обновить профиль.'));
      } finally {
        setSaving(false);
      }
    };

    if (previousRegion && nextRegion && previousRegion !== nextRegion) {
      Modal.confirm({
        title: 'Подтвердите смену региона',
        content: `Вы меняете регион с "${previousRegion}" на "${nextRegion}". Подтвердить?`,
        okText: 'Да, изменить',
        cancelText: 'Отмена',
        onOk: () => void submit(),
      });
      return;
    }

    await submit();
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {contextHolder}
      <Typography.Title level={3} style={{ margin: 0 }}>Профиль</Typography.Title>
      {error ? <Alert type="error" showIcon message={error} /> : null}

      <Card title="Мои данные">
        <Form form={form} layout="vertical" onFinish={(values) => void handleSubmit(values)}>
          <Form.Item label="ФИО" name="fullName" rules={[{ required: true, min: 5, message: 'Минимум 5 символов' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email', message: 'Введите корректный email' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Регион" name="region" rules={[{ required: true, min: 2, message: 'Введите регион' }]}>
            <Input placeholder="Например, Архангельская область" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={saving}>Сохранить</Button>
        </Form>
      </Card>
    </Space>
  );
}
