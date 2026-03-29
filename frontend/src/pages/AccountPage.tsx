import { Alert, AutoComplete, Button, Card, Empty, Input, List, Space, Statistic, Table, Tag, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { extractApiErrorMessage } from '../api/error';
import { getRequests } from '../api/requests';
import { getSubscriberById, getSubscribers } from '../api/subscribers';
import type { ServiceRequest } from '../types/requests';
import type { Subscriber, SubscriberDetails } from '../types/subscribers';

const RUB_FORMATTER = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 2,
});

export function AccountPage() {
  const [subscriberId, setSubscriberId] = useState('');
  const [subscriberQuery, setSubscriberQuery] = useState('');
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<SubscriberDetails | null>(null);
  const [recentRequests, setRecentRequests] = useState<ServiceRequest[]>([]);

  useEffect(() => {
    async function loadSubscribers() {
      try {
        const data = await getSubscribers();
        setSubscribers(data);
      } catch {
        // silently ignore, manual input still available
      }
    }

    void loadSubscribers();
  }, []);

  const subscriberOptions = useMemo(
    () => subscribers.map((item) => ({ value: item.id, label: `${item.fullName} (${item.address})` })),
    [subscribers],
  );

  const stats = useMemo(() => {
    const total = recentRequests.length;
    const open = recentRequests.filter((item) => item.status === 'NEW' || item.status === 'IN_PROGRESS').length;
    const done = recentRequests.filter((item) => item.status === 'DONE').length;
    return { total, open, done };
  }, [recentRequests]);

  async function handleSearch(explicitId?: string) {
    const targetId = explicitId?.trim() || subscriberId.trim() || subscriberQuery.trim();
    if (!targetId) {
      setError('Введите ID абонента или выберите абонента по ФИО.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const subscriber = await getSubscriberById(targetId);
      setDetails(subscriber);

      const requests = await getRequests();
      const accountIds = new Set(subscriber.accounts.map((account) => account.id));
      const linkedRequests = requests
        .filter((item) => accountIds.has(item.accountId))
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .slice(0, 5);

      setRecentRequests(linkedRequests);
    } catch (err) {
      setDetails(null);
      setRecentRequests([]);
      setError(extractApiErrorMessage(err, 'Не удалось получить лицевой счёт по указанному абоненту.'));
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
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <AutoComplete
            style={{ width: '100%' }}
            size="large"
            options={subscriberOptions}
            value={subscriberQuery}
            onSearch={setSubscriberQuery}
            onSelect={(value) => {
              setSubscriberId(value);
              setSubscriberQuery(value);
              void handleSearch(value);
            }}
            filterOption={(inputValue, option) =>
              (option?.label as string).toLowerCase().includes(inputValue.toLowerCase())
            }
          >
            <Input placeholder="Поиск абонента по ФИО/адресу" />
          </AutoComplete>

          <Space.Compact style={{ width: '100%' }}>
            <Input
              size="large"
              value={subscriberId}
              onChange={(event) => setSubscriberId(event.target.value)}
              placeholder="Или введите subscriberId вручную"
            />
            <Button type="primary" size="large" onClick={handleSearch} loading={loading}>
              Открыть счёт
            </Button>
          </Space.Compact>
        </Space>
      </Card>

      {error ? <Alert type="error" showIcon message={error} /> : null}

      {details ? (
        <>
          <Card title={`Абонент: ${details.fullName}`}>
            <Typography.Paragraph style={{ marginBottom: 8 }}>Адрес: {details.address}</Typography.Paragraph>
            <Typography.Paragraph>Телефон: {details.phone ?? '—'}</Typography.Paragraph>

            <Space size="large" style={{ marginBottom: 16 }}>
              <Statistic title="Лицевых счетов" value={details.accounts.length} />
              <Statistic title="Последних заявок" value={stats.total} />
              <Statistic title="Открытых заявок" value={stats.open} />
              <Statistic title="Выполнено" value={stats.done} />
            </Space>

            <Table
              rowKey="id"
              dataSource={details.accounts}
              pagination={false}
              locale={{ emptyText: 'У абонента пока нет лицевых счетов' }}
              columns={[
                { title: 'Номер счёта', dataIndex: 'accountNumber', key: 'accountNumber' },
                { title: 'Услуга', dataIndex: 'serviceType', key: 'serviceType' },
                {
                  title: 'Баланс',
                  dataIndex: 'balance',
                  key: 'balance',
                  render: (value: string | number) => RUB_FORMATTER.format(Number(value)),
                },
              ]}
            />
          </Card>

          <Card title="Последние заявки по лицевым счетам">
            <List
              dataSource={recentRequests}
              locale={{ emptyText: 'Заявки по лицевым счетам не найдены' }}
              renderItem={(item) => (
                <List.Item>
                  <Space direction="vertical" size={0}>
                    <Typography.Text strong>{item.title}</Typography.Text>
                    <Typography.Text type="secondary">{new Date(item.createdAt).toLocaleString('ru-RU')}</Typography.Text>
                  </Space>
                  <Tag>{item.status}</Tag>
                </List.Item>
              )}
            />
          </Card>
        </>
      ) : (
        <Empty description="Выберите абонента для просмотра лицевого счёта" />
      )}
    </Space>
  );
}
