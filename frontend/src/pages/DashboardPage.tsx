import { CreditCardOutlined, DollarCircleOutlined, TeamOutlined, ToolOutlined, UserAddOutlined } from '@ant-design/icons';
import { Alert, Button, Col, Drawer, Form, Input, Modal, Row, Segmented, Select, Space, Typography, message } from 'antd';
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
  const [createTicketOpen, setCreateTicketOpen] = useState(false);
  const [createSubscriberOpen, setCreateSubscriberOpen] = useState(false);
  const [ticketSaving, setTicketSaving] = useState(false);
  const [subscriberSaving, setSubscriberSaving] = useState(false);
  const [localRequests, setLocalRequests] = useState<ServiceRequest[]>([]);
  const [localSubscribers, setLocalSubscribers] = useState(0);
  const [ticketDrawer, setTicketDrawer] = useState<ServiceRequest | null>(null);
  const [activityFeed, setActivityFeed] = useState<Array<{ key: string; title: string; subtitle: string; date: string }>>([]);
  const [messageApi, contextHolder] = message.useMessage();
  const [ticketForm] = Form.useForm();
  const [subscriberForm] = Form.useForm();

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
      activeSubscribers: activeSubscribers + localSubscribers,
      openTickets: openTickets + localRequests.length,
      totalDebt,
      monthlyPayments: 0,
      overdueTickets: 0,
      debtorsCount: 0,
      lastUpdated: '20.05.2025 14:36',
    };
  }, [requests, subscribers, localRequests.length, localSubscribers]);

  const recentRequests = useMemo(
    () => [...localRequests, ...requests].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 5),
    [localRequests, requests],
  );
  const chartData = useMemo<ChartPoint[]>(() => [], []);
  const recentActivities = useMemo(
    () => [...activityFeed, ...recentRequests.map((item) => ({
      key: item.id,
      title: `Создана заявка #${item.id.slice(0, 4)}`,
      subtitle: item.createdByUser?.email ?? `Пользователь ${item.createdByUserId}`,
      date: new Date(item.createdAt).toLocaleString('ru-RU'),
    }))].slice(0, 4),
    [activityFeed, recentRequests],
  );

  async function handleCreateTicket(values: { subscriber: string; title: string; description: string; address: string; priority: string }) {
    try {
      setTicketSaving(true);
      const now = new Date().toISOString();
      const id = `c${Math.floor(Math.random() * 10000)}`;
      const created: ServiceRequest = {
        id,
        accountId: values.subscriber,
        title: values.title,
        description: values.description,
        status: 'NEW',
        category: 'QUESTION',
        createdAt: now,
        updatedAt: now,
        createdByUserId: 0,
      } as ServiceRequest;
      setLocalRequests((prev) => [created, ...prev]);
      setActivityFeed((prev) => [
        { key: `act-${id}`, title: `Создана заявка #${id}`, subtitle: values.subscriber, date: new Date(now).toLocaleString('ru-RU') },
        ...prev,
      ]);
      setCreateTicketOpen(false);
      ticketForm.resetFields();
      messageApi.success('Заявка создана');
    } finally {
      setTicketSaving(false);
    }
  }

  async function handleCreateSubscriber(values: { fullName: string; account: string; address: string; phone: string; email: string; status: string }) {
    try {
      setSubscriberSaving(true);
      setLocalSubscribers((prev) => prev + 1);
      setActivityFeed((prev) => [
        { key: `sub-${Date.now()}`, title: `Добавлен абонент ${values.fullName}`, subtitle: `Лицевой счёт: ${values.account}`, date: new Date().toLocaleString('ru-RU') },
        ...prev,
      ]);
      setCreateSubscriberOpen(false);
      subscriberForm.resetFields();
      messageApi.success('Абонент добавлен');
    } finally {
      setSubscriberSaving(false);
    }
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {contextHolder}
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
            <Button type="primary" size="large" icon={<ToolOutlined />} onClick={() => setCreateTicketOpen(true)}>Создать заявку</Button>
            <Button size="large" icon={<UserAddOutlined />} onClick={() => setCreateSubscriberOpen(true)}>Добавить абонента</Button>
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

      <div className="lower-dashboard-grid">
        <div className="recent-tickets-card">
          <RecentTicketsTable rows={recentRequests} loading={loading} onOpenAll={() => navigate('/requests')} onCreate={() => setCreateTicketOpen(true)} onOpenRow={(id) => {
            const item = recentRequests.find((request) => request.id === id) ?? null;
            setTicketDrawer(item);
          }} />
        </div>
        <div className="recent-activity-card">
          <RecentActivityList items={recentActivities} loading={loading} onOpenAll={() => navigate('/logs')} />
        </div>
      </div>

      {loading ? <Typography.Text type="secondary">Загрузка данных...</Typography.Text> : null}

      <Modal
        open={createTicketOpen}
        title="Создать заявку"
        okText="Создать"
        cancelText="Отмена"
        confirmLoading={ticketSaving}
        onCancel={() => setCreateTicketOpen(false)}
        onOk={() => ticketForm.submit()}
      >
        <Form form={ticketForm} layout="vertical" onFinish={(values) => void handleCreateTicket(values)}>
          <Form.Item name="subscriber" label="Абонент" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="title" label="Тема" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="Описание" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="address" label="Адрес" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="priority" label="Приоритет" initialValue="NORMAL"><Select options={[{ value: 'LOW', label: 'Низкий' }, { value: 'NORMAL', label: 'Средний' }, { value: 'HIGH', label: 'Высокий' }]} /></Form.Item>
        </Form>
      </Modal>

      <Modal
        open={createSubscriberOpen}
        title="Добавить абонента"
        okText="Добавить"
        cancelText="Отмена"
        confirmLoading={subscriberSaving}
        onCancel={() => setCreateSubscriberOpen(false)}
        onOk={() => subscriberForm.submit()}
      >
        <Form form={subscriberForm} layout="vertical" onFinish={(values) => void handleCreateSubscriber(values)}>
          <Form.Item name="fullName" label="ФИО" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="account" label="Лицевой счёт" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="address" label="Адрес" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="phone" label="Телефон"><Input /></Form.Item>
          <Form.Item name="email" label="Email"><Input /></Form.Item>
          <Form.Item name="status" label="Статус" initialValue="ACTIVE"><Select options={[{ value: 'ACTIVE', label: 'Активен' }, { value: 'INACTIVE', label: 'Неактивен' }]} /></Form.Item>
        </Form>
      </Modal>

      <Drawer
        open={Boolean(ticketDrawer)}
        title={ticketDrawer ? `Заявка #${ticketDrawer.id}` : 'Заявка'}
        onClose={() => setTicketDrawer(null)}
        width={420}
      >
        {ticketDrawer ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Typography.Text strong>Тема: {ticketDrawer.title}</Typography.Text>
            <Typography.Text>Описание: {ticketDrawer.description}</Typography.Text>
            <Typography.Text>Статус: {ticketDrawer.status}</Typography.Text>
            <Typography.Text>Приоритет: Средний</Typography.Text>
            <Typography.Text>Дата создания: {new Date(ticketDrawer.createdAt).toLocaleString('ru-RU')}</Typography.Text>
            <Button type="link" onClick={() => navigate('/requests')}>Открыть полную страницу</Button>
          </Space>
        ) : null}
      </Drawer>
    </Space>
  );
}
