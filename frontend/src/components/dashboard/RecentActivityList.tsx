import { CheckCircleOutlined, LoginOutlined, PlusCircleOutlined, ProfileOutlined } from '@ant-design/icons';
import { Card, Space, Typography } from 'antd';

const items = [
  { key: '1', icon: <ProfileOutlined />, title: 'Создана заявка #1001', subtitle: 'Иванов И.И.', date: '20.05.2025 14:35' },
  { key: '2', icon: <PlusCircleOutlined />, title: 'Добавлен абонент Иванов И.И.', subtitle: 'Оператор admin', date: '20.05.2025 14:20' },
  { key: '3', icon: <CheckCircleOutlined />, title: 'Начисление по лицевому счёту 000123', subtitle: 'Сумма: 0 ₽', date: '20.05.2025 09:10' },
  { key: '4', icon: <LoginOutlined />, title: 'Вход в систему', subtitle: 'Пользователь: admin', date: '20.05.2025 08:55' },
];

export function RecentActivityList() {
  return (
    <Card title="Последние действия" extra={<Typography.Link>Все логи →</Typography.Link>}>
      <Space direction="vertical" style={{ width: '100%' }} size={10}>
        {items.map((item) => (
          <div key={item.key} className="activity-row">
            <div className="activity-row__icon">{item.icon}</div>
            <div className="activity-row__meta">
              <Typography.Text strong style={{ fontSize: 13 }}>{item.title}</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>{item.subtitle}</Typography.Text>
            </div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{item.date}</Typography.Text>
          </div>
        ))}
      </Space>
    </Card>
  );
}
