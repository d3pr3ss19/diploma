import { Alert, Button, Card, Form, Input, Modal, Space, Typography, message } from 'antd';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { writeAuth } from '../app/auth-storage';
import { createSignupRequest, login } from '../api/auth';
import type { LoginRequest } from '../types/auth';

export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [signupForm] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSubmit(values: { email: string; password: string }) {
    setLoading(true);
    setError(null);

    try {
      const payload: LoginRequest = {
        email: values.email,
        password: values.password,
      };
      const auth = await login(payload);
      writeAuth(auth);
      const redirectTo = (location.state as { from?: string } | null)?.from ?? '/dashboard';
      navigate(redirectTo, { replace: true });
    } catch {
      setError('Не удалось выполнить вход. Проверьте backend и повторите попытку.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(values: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    apartment?: string;
    region: string;
  }) {
    try {
      setSignupLoading(true);
      await createSignupRequest(values);
      messageApi.success('Заявка на регистрацию отправлена оператору.');
      setSignupOpen(false);
      signupForm.resetFields();
    } catch {
      messageApi.error('Не удалось отправить заявку на регистрацию.');
    } finally {
      setSignupLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      {contextHolder}
      <div className="auth-panel">
        <div className="auth-panel__hero">
          <Typography.Title level={2} style={{ color: '#fff', marginTop: 0 }}>
            Добро пожаловать в цифровой кабинет
          </Typography.Title>
          <Typography.Paragraph style={{ color: 'rgba(255,255,255,0.92)', fontSize: 16 }}>
            Управляйте заявками, лицевыми счетами и оплатой услуг в одном интерфейсе.
            Всё важное — на расстоянии одного клика.
          </Typography.Paragraph>
          <Card size="small" style={{ borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
            <Typography.Text style={{ color: '#fff' }}>
              Новый пользователь? Отправьте заявку на регистрацию — оператор подключит кабинет.
            </Typography.Text>
          </Card>
        </div>
        <div className="auth-panel__form">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Typography.Title level={4} style={{ margin: 0 }}>
              Вход в систему
            </Typography.Title>

            {error ? <Alert type="error" showIcon message={error} /> : null}

            <Form layout="vertical" onFinish={handleSubmit}>
              <Form.Item label="Email" name="email" rules={[{ required: true, message: 'Введите email' }]}>
                <Input placeholder="name@example.com" size="large" />
              </Form.Item>
              <Form.Item
                label="Пароль"
                name="password"
                rules={[{ required: true, message: 'Введите пароль' }]}
              >
                <Input.Password placeholder="••••••••" size="large" />
              </Form.Item>
              <Button type="primary" block htmlType="submit" loading={loading} size="large">
                Войти
              </Button>
              <Button style={{ marginTop: 8 }} block onClick={() => setSignupOpen(true)} size="large">
                Зарегистрироваться
              </Button>
            </Form>
          </Space>
        </div>
      </div>

      <Modal
        open={signupOpen}
        title="Заявка на регистрацию"
        okText="Отправить"
        cancelText="Отмена"
        onCancel={() => setSignupOpen(false)}
        onOk={() => signupForm.submit()}
        confirmLoading={signupLoading}
      >
        <Form form={signupForm} layout="vertical" onFinish={(values) => void handleSignup(values as never)}>
          <Form.Item name="fullName" label="ФИО" rules={[{ required: true, min: 5 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Телефон" rules={[{ required: true, min: 6 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Адрес" rules={[{ required: true, min: 5 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="apartment" label="Квартира">
            <Input />
          </Form.Item>
          <Form.Item name="region" label="Регион" rules={[{ required: true, min: 2 }]}>
            <Input placeholder="Например, Архангельская область" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
