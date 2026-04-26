import { CreditCardOutlined, DollarCircleOutlined, TeamOutlined, ToolOutlined, UserAddOutlined } from '@ant-design/icons';
import { Alert, Button, Col, Row, Segmented, Space, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DebtStatusCard } from '../components/dashboard/DebtStatusCard';
import { KpiCard } from '../components/dashboard/KpiCard';
import { PaymentsChart } from '../components/dashboard/PaymentsChart';
import { RecentActivityList } from '../components/dashboard/RecentActivityList';
import { RecentTicketsTable } from '../components/dashboard/RecentTicketsTable';
import type { ChartPoint, DashboardMockData } from '../components/dashboard/types';
import { extractApiErrorMessage } from '../api/error';
import { getRequests } from '../api/requests';
import { getSubscribers } from '../api/subscribers';
import type { ServiceRequest } from '../types/requests';
import type { Subscriber } from '../types/subscribers';

export function DashboardPage() {
  const navigate = useNavigate();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('30');

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

  const mockData = useMemo<DashboardMockData>(() => {
    const activeSubscribers = subscribers.filter((item) => item.user?.isActual ?? true).length;
    const openTickets = requests.filter((item) => item.status === 'NEW' || item.status === 'IN_PROGRESS').length;
    const totalDebt = subscribers.reduce((sum, subscriber) => {
      const subscriberDebt = (subscriber.accounts ?? []).reduce((accountSum, account) => {
        const balance = Number(account.balance);
        return accountSum + (Number.isFinite(balance) && balance > 0 ? balance : 0);
      }, 0);
      return sum + subscriberDebt;
    }, 0);

    return {
      activeSubscribers,
      openTickets,
      totalDebt,
      monthlyPayments: 0,
      overdueTickets: 0,
      debtorsCount: 0,
      lastUpdated: '20.05.2025 14:36',
    };
  }, [requests, subscribers]);

  const recentRequests = useMemo(() => [...requests].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 1), [requests]);
  const chartData = useMemo<ChartPoint[]>(() => [], []);
  const recentActivities = useMemo(
    () => recentRequests.map((item) => ({
      key: item.id,
      title: `Создана заявка #${item.id.slice(0, 4)}`,
      subtitle: item.createdByUser?.email ?? `Пользователь ${item.createdByUserId}`,
      date: new Date(item.createdAt).toLocaleString('ru-RU'),
    })),
    [recentRequests],
  );

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div className="dashboard-summary">
        <div>
          <Typography.Title level={1} className="dashboard-summary__title">Панель мониторинга</Typography.Title>
          <Typography.Text className="dashboard-summary__subtitle">Сводка по абонентам, заявкам, оплатам и задолженности</Typography.Text>
          <div className="dashboard-summary__status">
            <span><span className="status-dot status-dot--green" />Система работает штатно</span>
            <span>•</span>
            <span><span className="status-dot status-dot--red" />1 заявка требует обработки</span>
            <span>•</span>
            <span>задолженность <strong style={{ color: '#16A34A' }}>{mockData.totalDebt.toLocaleString('ru-RU')} ₽</strong></span>
          </div>
        </div>
        <div className="dashboard-summary__actions">
          <Segmented options={['Сегодня', 'Неделя', 'Месяц']} defaultValue="Сегодня" />
          <Space>
            <Button type="primary" size="large" icon={<ToolOutlined />} onClick={() => navigate('/requests')}>Создать заявку</Button>
            <Button size="large" icon={<UserAddOutlined />} onClick={() => navigate('/subscribers')}>Добавить абонента</Button>
          </Space>
        </div>
      </div>

      {error ? <Alert type="error" showIcon message={error} /> : null}

      <div className="kpi-grid">
        <KpiCard icon={<TeamOutlined />} colorClass="kpi-icon--blue" title="Абоненты" value={mockData.activeSubscribers} label="активных" status="+0 за неделю" onOpen={() => navigate('/subscribers')} />
        <KpiCard icon={<ToolOutlined />} colorClass="kpi-icon--amber" title="Заявки" value={mockData.openTickets} label="открытая" status="0 просроченных" onOpen={() => navigate('/requests')} />
        <KpiCard icon={<DollarCircleOutlined />} colorClass="kpi-icon--green" title="Финансы" value={`${mockData.totalDebt.toLocaleString('ru-RU')} ₽`} label="задолженность" status="Нет просрочек" onOpen={() => navigate('/account')} />
        <KpiCard icon={<CreditCardOutlined />} colorClass="kpi-icon--purple" title="Оплаты" value={`${mockData.monthlyPayments.toLocaleString('ru-RU')} ₽`} label="за месяц" status="0 платежей" onOpen={() => navigate('/billing')} />
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={15}><PaymentsChart points={chartData} loading={loading} period={period} onPeriodChange={setPeriod} onOpenBilling={() => navigate('/billing')} /></Col>
        <Col xs={24} xl={9}><DebtStatusCard totalDebt={mockData.totalDebt} debtorsCount={mockData.debtorsCount} /></Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={15}><RecentTicketsTable rows={recentRequests} loading={loading} onOpenAll={() => navigate('/requests')} onCreate={() => navigate('/requests')} onOpenRow={() => navigate('/requests')} /></Col>
        <Col xs={24} xl={9}><RecentActivityList items={recentActivities} loading={loading} onOpenAll={() => navigate('/logs')} /></Col>
      </Row>

      {loading ? <Typography.Text type="secondary">Загрузка данных...</Typography.Text> : null}
    </Space>
  );
}
