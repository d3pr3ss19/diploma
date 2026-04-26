import { Alert, Card, Col, Progress, Row, Segmented, Skeleton, Space, Statistic, Table, Tag, Typography } from 'antd';
import { CreditCardOutlined, TeamOutlined, ToolOutlined } from '@ant-design/icons';
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

  const recentRequests = useMemo(
    () => [...requests].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 5),
    [requests],
  );

  const activityItems = useMemo(
    () => recentRequests.map((item) => ({
      id: item.id,
      title: item.title,
      createdAt: item.createdAt,
      status: item.status,
      author: item.createdByUser?.email ?? `ID ${item.createdByUserId}`,
    })),
    [recentRequests],
  );

  const fakeBars = [8, 12, 16, 10, 5, 14, 18, 9, 6, 20, 7, 12];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card className="page-intro">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} xl={14}>
            <Typography.Title level={2} style={{ marginBottom: 6, marginTop: 0 }}>Панель мониторинга</Typography.Title>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 10 }}>
              Сводка по абонентам, заявкам, оплатам и задолженности.
            </Typography.Paragraph>
            <Space wrap>
              <Tag color="success">Система работает штатно</Tag>
              <Tag color={stats.openRequests > 0 ? 'error' : 'success'}>{stats.openRequests} заявка требует обработки</Tag>
              <Tag color="processing">Задолженность: {RUB_FORMATTER.format(stats.totalDebt)}</Tag>
            </Space>
          </Col>
          <Col xs={24} xl={10}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Segmented block options={['Сегодня', 'Неделя', 'Месяц']} defaultValue="Сегодня" />
              <Space style={{ justifyContent: 'flex-end', width: '100%' }} wrap>
                <Tag color="blue" style={{ padding: '8px 12px', borderRadius: 10 }}>+ Создать заявку</Tag>
                <Tag color="geekblue" style={{ padding: '8px 12px', borderRadius: 10 }}>+ Добавить абонента</Tag>
              </Space>
            </Space>
          </Col>
        </Row>
      </Card>

      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card className="dashboard-kpi" style={{ minHeight: 140 }}>
            <Space size={10} style={{ marginBottom: 8 }}>
              <TeamOutlined style={{ color: '#2f6bff', fontSize: 18 }} />
              <Typography.Text strong>Абоненты</Typography.Text>
            </Space>
            {loading ? <Skeleton active paragraph={false} /> : <Statistic title="Активные абоненты" value={stats.activeSubscribers} />}
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="dashboard-kpi" style={{ minHeight: 140 }}>
            <Space size={10} style={{ marginBottom: 8 }}>
              <ToolOutlined style={{ color: '#2f6bff', fontSize: 18 }} />
              <Typography.Text strong>Сервис</Typography.Text>
            </Space>
            {loading ? <Skeleton active paragraph={false} /> : <Statistic title="Открытые заявки" value={stats.openRequests} />}
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="dashboard-kpi" style={{ minHeight: 140 }}>
            <Space size={10} style={{ marginBottom: 8 }}>
              <CreditCardOutlined style={{ color: '#2f6bff', fontSize: 18 }} />
              <Typography.Text strong>Финансы</Typography.Text>
            </Space>
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
        <Col xs={24} md={8}>
          <Card className="dashboard-kpi" style={{ minHeight: 140 }}>
            <Space size={10} style={{ marginBottom: 8 }}>
              <CreditCardOutlined style={{ color: '#7a4bd6', fontSize: 18 }} />
              <Typography.Text strong>Оплаты</Typography.Text>
            </Space>
            {loading ? <Skeleton active paragraph={false} /> : <Statistic title="За месяц" value={RUB_FORMATTER.format(0)} />}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card title="Оплаты и начисления">
            <div className="fake-chart">
              {fakeBars.map((value, index) => (
                <div key={index} className="fake-chart__bar-wrap">
                  <div className="fake-chart__bar" style={{ height: `${value * 10}px` }} />
                </div>
              ))}
            </div>
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card title="Статус задолженности">
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <Statistic title="Общая задолженность" value={RUB_FORMATTER.format(stats.totalDebt)} />
              <Statistic title="Должников" value={stats.totalDebt > 0 ? 1 : 0} />
              <Progress type="circle" percent={stats.totalDebt > 0 ? 40 : 0} strokeColor="#52c41a" format={(percent) => `${percent}%`} />
              <Tag color="success">Нет просроченной задолженности</Tag>
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card title="Последние заявки">
            <Table
              rowKey="id"
              pagination={false}
              dataSource={recentRequests}
              columns={[
                { title: '№', dataIndex: 'id', render: (value: string) => `#${value.slice(0, 6)}` },
                { title: 'Тема', dataIndex: 'title' },
                { title: 'Статус', dataIndex: 'status', render: (value: string) => <Tag>{value}</Tag> },
                { title: 'Дата', dataIndex: 'createdAt', render: (value: string) => new Date(value).toLocaleString('ru-RU') },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card title="Последние действия">
            <Space direction="vertical" style={{ width: '100%' }}>
              {activityItems.map((item) => (
                <div key={item.id} className="activity-item">
                  <Typography.Text strong>{item.title}</Typography.Text>
                  <Typography.Text type="secondary">{item.author}</Typography.Text>
                  <Typography.Text type="secondary">{new Date(item.createdAt).toLocaleString('ru-RU')}</Typography.Text>
                </div>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
