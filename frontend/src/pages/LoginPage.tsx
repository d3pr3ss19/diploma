import { Button, Card, Form, Input, Select, Space, Typography } from 'antd';

export function LoginPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <Card style={{ width: 420 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Вход в систему
          </Typography.Title>
          <Form layout="vertical">
            <Form.Item label="Роль" required>
              <Select
                options={[
                  { value: 'ADMIN', label: 'Администратор' },
                  { value: 'OPERATOR', label: 'Оператор' },
                  { value: 'SUBSCRIBER', label: 'Абонент' },
                ]}
              />
            </Form.Item>
            <Form.Item label="ID пользователя" required>
              <Input placeholder="например: user-1" />
            </Form.Item>
            <Button type="primary" block>
              Войти
            </Button>
          </Form>
        </Space>
      </Card>
    </div>
  );
}
