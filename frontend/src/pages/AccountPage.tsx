import { Alert, Button, Card, Empty, Input, Space, Table, Typography } from 'antd';
import { useState } from 'react';
import { getSubscriberById } from '../api/subscribers';
import type { SubscriberDetails } from '../types/subscribers';

export function AccountPage() {
  const [subscriberId, setSubscriberId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<SubscriberDetails | null>(null);

  async function handleSearch() {
    if (!subscriberId.trim()) {
      setError('Введите ID абонента.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getSubscriberById(subscriberId.trim());
      setDetails(data);
    } catch {
      setDetails(null);
      setError('Не удалось получить лицевой счёт по указанному ID абонента.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Typography.Title level={3} style={{ marginBottom: 0 }}>
        Лицевой счёт
      </Typography.Title>

      <Card>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            value={subscriberId}
            onChange={(event) => setSubscriberId(event.target.value)}
            placeholder="Введите subscriberId"
          />
          <Button type="primary" onClick={handleSearch} loading={loading}>
            Найти
          </Button>
        </Space.Compact>
      </Card>

      {error ? <Alert type="error" showIcon message={error} /> : null}

      {details ? (
        <Card title={`Абонент: ${details.fullName}`}>
          <Typography.Paragraph style={{ marginBottom: 8 }}>
            Адрес: {details.address}
          </Typography.Paragraph>
          <Typography.Paragraph>Телефон: {details.phone ?? '—'}</Typography.Paragraph>

          <Table
            rowKey="id"
            dataSource={details.accounts}
            pagination={false}
            locale={{ emptyText: 'У абонента пока нет лицевых счетов' }}
            columns={[
              { title: 'Номер счёта', dataIndex: 'accountNumber', key: 'accountNumber' },
              { title: 'Услуга', dataIndex: 'serviceType', key: 'serviceType' },
              { title: 'Баланс', dataIndex: 'balance', key: 'balance' },
            ]}
          />
        </Card>
      ) : (
        <Empty description="Выберите абонента для просмотра лицевого счёта" />
      )}
    </Space>
  );
}
