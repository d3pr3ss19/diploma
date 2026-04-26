import { Alert, Button, Card, Col, Descriptions, Form, Input, Modal, Row, Space, Statistic, Typography, message } from 'antd';
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
      <Card className="page-intro">
        <Typography.Title level={3} style={{ margin: 0 }}>Профиль</Typography.Title>
        <Typography.Text type="secondary">Управляйте личными данными и настройками региона в одном месте.</Typography.Text>
      </Card>
      {error ? <Alert type="error" showIcon message={error} /> : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Typography.Title level={4} style={{ margin: 0 }}>{auth?.user.fullName ?? 'Пользователь'}</Typography.Title>
              <Typography.Text type="secondary">{auth?.user.email}</Typography.Text>
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="Роль">{auth?.user.role}</Descriptions.Item>
                <Descriptions.Item label="Регион">{auth?.user.region ?? 'Не задан'}</Descriptions.Item>
              </Descriptions>
              <Row gutter={12}>
                <Col span={12}><Statistic title="ID пользователя" value={auth?.user.id ?? 0} /></Col>
                <Col span={12}><Statistic title="Статус" value="Активен" /></Col>
              </Row>
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card title="Редактирование профиля">
            <Form form={form} layout="vertical" onFinish={(values) => void handleSubmit(values)}>
              <Row gutter={12}>
                <Col xs={24} md={12}>
                  <Form.Item label="ФИО" name="fullName" rules={[{ required: true, min: 5, message: 'Минимум 5 символов' }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email', message: 'Введите корректный email' }]}>
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="Регион" name="region" rules={[{ required: true, min: 2, message: 'Введите регион' }]}>
                <Input placeholder="Например, Архангельская область" />
              </Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={saving}>Сохранить изменения</Button>
                <Typography.Text type="secondary">При смене региона будет запрошено подтверждение.</Typography.Text>
              </Space>
            </Form>
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
