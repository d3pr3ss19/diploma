import { Alert, Card, Col, Row, Skeleton, Space, Statistic, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { extractApiErrorMessage } from '../api/error';
import { getRequests } from '../api/requests';
import { getSubscribers } from '../api/subscribers';
import type { ServiceRequest } from '../types/requests';
import type { Subscriber } from '../types/subscribers';

const RUB_FORMATTER = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 2,
});

export function DashboardPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        setError(null);
        const [subscribersData, requestsData] = await Promise.all([getSubscribers(), getRequests()]);
        setSubscribers(subscribersData);
        setRequests(requestsData);
      } catch (err) {
        setError(extractApiErrorMessage(err, 'Не удалось загрузить сводные показатели.'));
      } finally {
        setLoading(false);
      }
    }

    void loadStats();
  }, []);

  const stats = useMemo(() => {
    const activeSubscribers = subscribers.filter((item) => item.user?.isActual ?? true).length;
    const openRequests = requests.filter((item) => item.status === 'NEW' || item.status === 'IN_PROGRESS').length;
    const totalDebt = subscribers.reduce((sum, subscriber) => {
      const subscriberDebt = (subscriber.accounts ?? []).reduce((accountSum, account) => {
        const balance = Number(account.balance);
        return accountSum + (Number.isFinite(balance) && balance > 0 ? balance : 0);
      }, 0);
      return sum + subscriberDebt;
    }, 0);

    return { activeSubscribers, openRequests, totalDebt };
  }, [requests, subscribers]);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card className="page-intro">
        <Typography.Title level={3} style={{ marginBottom: 8 }}>Панель мониторинга</Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          Ключевые показатели собраны в одном месте, чтобы быстро оценить текущую нагрузку и состояние расчётов.
        </Typography.Paragraph>
      </Card>

      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card className="app-card-soft" style={{ minHeight: 136 }}>
            {loading ? <Skeleton active paragraph={false} /> : <Statistic title="Активные абоненты" value={stats.activeSubscribers} />}
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="app-card-soft" style={{ minHeight: 136 }}>
            {loading ? <Skeleton active paragraph={false} /> : <Statistic title="Открытые заявки" value={stats.openRequests} />}
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="app-card-soft" style={{ minHeight: 136 }}>
            {loading ? (
              <Skeleton active paragraph={false} />
            ) : (
              <Statistic
                title="Суммарная задолженность"
                value={stats.totalDebt}
                formatter={(value) => RUB_FORMATTER.format(Number(value))}
              />
            )}
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
