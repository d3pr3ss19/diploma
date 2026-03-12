import { Alert, Button, Card, Form, Input, Select, Space, Typography } from 'antd';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { writeAuth } from '../app/auth-storage';
import { login } from '../api/auth';
import type { LoginRequest, UserRole } from '../types/auth';

type DemoAccount = {
  role: UserRole;
  email: string;
  password: string;
  label: string;
};

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'ADMIN',
    email: 'admin@kp.local',
    password: 'password123',
    label: 'Администратор',
  },
  {
    role: 'OPERATOR',
    email: 'operator@kp.local',
    password: 'password123',
    label: 'Оператор',
  },
  {
    role: 'SUBSCRIBER',
    email: 'subscriber@kp.local',
    password: 'password123',
    label: 'Абонент',
  },
];

const DEFAULT_ACCOUNT = DEMO_ACCOUNTS[1];

export function LoginPage() {
  const [form] = Form.useForm<{ email: string; password: string; role: UserRole }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSubmit(values: { email: string; password: string; role: UserRole }) {
    setLoading(true);
    setError(null);

    try {
      const payload: LoginRequest = {
        email: values.email,
        password: values.password,
        role: values.role,
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

  function applyDemoAccount(account: DemoAccount) {
    form.setFieldsValue({ email: account.email, password: account.password, role: account.role });
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <Card style={{ width: 480 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Вход в систему
          </Typography.Title>

          {error ? <Alert type="error" showIcon message={error} /> : null}

          <Alert
            type="info"
            showIcon
            message="Демо-вход"
            description="На текущем MVP backend принимает любую пару email/пароль (пароль от 8 символов). Для удобства используйте тестовые кнопки ниже."
          />

          <Space wrap>
            {DEMO_ACCOUNTS.map((account) => (
              <Button key={account.role} onClick={() => applyDemoAccount(account)}>
                {account.label}
              </Button>
            ))}
          </Space>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              role: DEFAULT_ACCOUNT.role,
              email: DEFAULT_ACCOUNT.email,
              password: DEFAULT_ACCOUNT.password,
            }}
          >
            <Form.Item label="Email" name="email" rules={[{ required: true, message: 'Введите email' }]}>
              <Input placeholder="operator@kp.local" />
            </Form.Item>
            <Form.Item
              label="Пароль"
              name="password"
              rules={[{ required: true, message: 'Введите пароль' }]}
            >
              <Input.Password placeholder="••••••••" />
            </Form.Item>
            <Form.Item label="Роль" name="role" rules={[{ required: true, message: 'Выберите роль' }]}>
              <Select
                options={[
                  { value: 'ADMIN', label: 'Администратор' },
                  { value: 'OPERATOR', label: 'Оператор' },
                  { value: 'SUBSCRIBER', label: 'Абонент' },
                ]}
              />
            </Form.Item>
            <Button type="primary" block htmlType="submit" loading={loading}>
              Войти
            </Button>
          </Form>
        </Space>
      </Card>
    </div>
  );
}
