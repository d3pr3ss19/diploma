import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Card, Descriptions, Space, Typography } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={16}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/tickets')}>К списку заявок</Button>
      <Card>
        <Typography.Title level={3} style={{ marginTop: 0 }}>Заявка #{id}</Typography.Title>
        <Descriptions bordered column={1} size="small">
          <Descriptions.Item label="Абонент">Иванов И.И.</Descriptions.Item>
          <Descriptions.Item label="Лицевой счёт">000123</Descriptions.Item>
          <Descriptions.Item label="Тема">Тесты</Descriptions.Item>
          <Descriptions.Item label="Описание">Детали заявки отображаются в карточке заявки.</Descriptions.Item>
          <Descriptions.Item label="Адрес">ул. Ленина, 10, п. 2</Descriptions.Item>
          <Descriptions.Item label="Статус">Открыта</Descriptions.Item>
          <Descriptions.Item label="Приоритет">Средний</Descriptions.Item>
        </Descriptions>
      </Card>
    </Space>
  );
}
