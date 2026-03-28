import { Alert, Button, Card, Form, Input, Space, Typography } from 'antd';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { writeAuth } from '../app/auth-storage';
import { login } from '../api/auth';
import type { LoginRequest } from '../types/auth';

export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <Card style={{ width: 420 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Вход в систему
          </Typography.Title>

          {error ? <Alert type="error" showIcon message={error} /> : null}

          <Form layout="vertical" onFinish={handleSubmit}>
            <Form.Item label="Email" name="email" rules={[{ required: true, message: 'Введите email' }]}>
              <Input placeholder="name@example.com" />
            </Form.Item>
            <Form.Item
              label="Пароль"
              name="password"
              rules={[{ required: true, message: 'Введите пароль' }]}
            >
              <Input.Password placeholder="••••••••" />
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
