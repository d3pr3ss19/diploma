import { Alert, List, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { getRequests } from '../api/requests';
import type { ServiceRequest } from '../types/requests';

export function RequestsPage() {
  const [items, setItems] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRequests() {
      try {
        setLoading(true);
        setError(null);
        const data = await getRequests();
        setItems(data);
      } catch {
        setError('Не удалось загрузить заявки. Проверьте backend и токен.');
      } finally {
        setLoading(false);
      }
    }

    void loadRequests();
  }, []);

  return (
    <>
      <Typography.Title level={3}>Заявки</Typography.Title>
      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}
      <List
        bordered
        loading={loading}
        dataSource={items}
        renderItem={(item) => (
          <List.Item>
            {item.title}
            <Tag style={{ marginLeft: 'auto' }}>{item.status}</Tag>
          </List.Item>
        )}
      />
    </>
  );
}
