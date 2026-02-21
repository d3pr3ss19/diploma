import { Alert, Table, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { getSubscribers } from '../api/subscribers';
import type { Subscriber } from '../types/subscribers';

export function SubscribersPage() {
  const [items, setItems] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSubscribers() {
      try {
        setLoading(true);
        setError(null);
        const data = await getSubscribers();
        setItems(data);
      } catch {
        setError('Не удалось загрузить абонентов. Проверьте backend и токен.');
      } finally {
        setLoading(false);
      }
    }

    void loadSubscribers();
  }, []);

  return (
    <>
      <Typography.Title level={3}>Абоненты</Typography.Title>
      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}
      <Table
        rowKey="id"
        loading={loading}
        dataSource={items}
        columns={[
          { title: 'ФИО', dataIndex: 'fullName', key: 'fullName' },
          { title: 'Телефон', dataIndex: 'phone', key: 'phone', render: (value: string | null) => value ?? '—' },
          { title: 'Адрес', dataIndex: 'address', key: 'address' },
          {
            title: 'Статус',
            key: 'status',
            render: () => <Tag color="green">ACTIVE</Tag>,
          },
        ]}
      />
    </>
  );
}
