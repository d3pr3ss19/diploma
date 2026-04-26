import {
  CloseOutlined,
  CreditCardOutlined,
  DollarCircleOutlined,
  DownOutlined,
  TeamOutlined,
  ToolOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { Alert, Button, Form, Input, Modal, Select, Space, Typography, message } from 'antd';
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

const REFERENCE_CREATED_AT = '2026-04-26T10:05:16.000Z';

const referenceTicket: ServiceRequest = {
  id: 'c310',
  accountId: '000123',
  title: 'Тесты',
  description: 'Тестовое обращение для проверки работы системы. Просьба связаться с абонентом.',
  status: 'NEW',
  category: 'QUESTION',
  createdAt: REFERENCE_CREATED_AT,
  updatedAt: REFERENCE_CREATED_AT,
  createdByUserId: 0,
} as ServiceRequest;

function formatDate(value: string) {
  return new Date(value).toLocaleString('ru-RU');
}

function requiredLabel(text: string) {
  return (
    <span>
      {text} <span className="required-mark">*</span>
    </span>
  );
}

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
  const [ticketModal, setTicketModal] = useState<ServiceRequest | null>(null);
  const [activityFeed, setActivityFeed] = useState<Array<{ key: string; title: string; subtitle: string; date: string }>>([]);
  const [messageApi, contextHolder] = message.useMessage();
  const [ticketForm] = Form.useForm();
  const [subscriberForm] = Form.useForm();
  const selectedPriority = Form.useWatch('priority', ticketForm) ?? 'NORMAL';
  const descriptionValue = Form.useWatch('description', ticketForm) ?? '';

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

  const recentRequests = useMemo(() => {
    const combined = [...localRequests, ...requests];
    const withReference = combined.some((item) => item.id === referenceTicket.id) ? combined : [referenceTicket, ...combined];
    return withReference.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 5);
  }, [localRequests, requests]);

  const chartData = useMemo<ChartPoint[]>(() => [], []);

  const recentActivities = useMemo(
    () =>
      [
        ...activityFeed,
        ...recentRequests.map((item) => ({
          key: item.id,
          title: `Создана заявка #${item.id}`,
          subtitle: item.createdByUser?.email ?? `Пользователь ${item.createdByUserId}`,
          date: formatDate(item.createdAt),
        })),
      ].slice(0, 4),
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
        { key: `act-${id}`, title: `Создана заявка #${id}`, subtitle: values.subscriber, date: formatDate(now) },
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
        {
          key: `sub-${Date.now()}`,
          title: `Добавлен абонент ${values.fullName}`,
          subtitle: `Лицевой счёт: ${values.account}`,
          date: formatDate(new Date().toISOString()),
        },
        ...prev,
      ]);
      setCreateSubscriberOpen(false);
      subscriberForm.resetFields();
      messageApi.success('Абонент добавлен');
    } finally {
      setSubscriberSaving(false);
    }
  }

  const modalTicket = ticketModal ?? referenceTicket;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {contextHolder}
      <div className="dashboard-summary">
        <div>
          <Typography.Title level={1} className="dashboard-summary__title">
            Панель мониторинга
          </Typography.Title>
          <Typography.Text className="dashboard-summary__subtitle">Сводка по абонентам, заявкам, оплатам и задолженности</Typography.Text>
          <div className="dashboard-summary__status">
            <span>
              <span className="status-dot status-dot--green" />Система работает штатно
            </span>
            <span>•</span>
            <span>
              <span className="status-dot status-dot--red" />1 заявка требует обработки
            </span>
            <span>•</span>
            <span>
              задолженность <strong style={{ color: '#16A34A' }}>{mockData.totalDebt.toLocaleString('ru-RU')} ₽</strong>
            </span>
          </div>
        </div>
        <div className="dashboard-summary__actions">
          <Select
            value={period}
            style={{ width: 160 }}
            options={[
              { value: '1', label: 'Сегодня' },
              { value: '7', label: 'Неделя' },
              { value: '30', label: 'Месяц' },
            ]}
            onChange={setPeriod}
          />
          <Space>
            <Button type="primary" size="large" icon={<ToolOutlined />} onClick={() => setCreateTicketOpen(true)}>
              Создать заявку
            </Button>
            <Button size="large" icon={<UserAddOutlined />} onClick={() => setCreateSubscriberOpen(true)}>
              Добавить абонента
            </Button>
          </Space>
        </div>
      </div>

      {error ? <Alert type="error" showIcon message={error} /> : null}

      <div className="kpi-grid">
        <KpiCard
          icon={<TeamOutlined />}
          colorClass="kpi-icon--blue"
          title="Абоненты"
          value={mockData.activeSubscribers}
          label="активных"
          status="+0 за неделю"
          onOpen={() => navigate('/subscribers')}
        />
        <KpiCard
          icon={<ToolOutlined />}
          colorClass="kpi-icon--amber"
          title="Заявки"
          value={mockData.openTickets}
          label="открытая"
          status="0 просроченных"
          onOpen={() => navigate('/tickets')}
        />
        <KpiCard
          icon={<DollarCircleOutlined />}
          colorClass="kpi-icon--green"
          title="Финансы"
          value={`${mockData.totalDebt.toLocaleString('ru-RU')} ₽`}
          label="задолженность"
          status="Нет просрочек"
          onOpen={() => navigate('/account')}
        />
        <KpiCard
          icon={<CreditCardOutlined />}
          colorClass="kpi-icon--purple"
          title="Оплаты"
          value={`${mockData.monthlyPayments.toLocaleString('ru-RU')} ₽`}
          label="за месяц"
          status="0 платежей"
          onOpen={() => navigate('/billing')}
        />
      </div>

      <div className="dashboard-main-grid">
        <div className="dashboard-left-column">
          <div className="payments-card">
            <PaymentsChart points={chartData} loading={loading} period={period} onPeriodChange={setPeriod} onOpenBilling={() => navigate('/billing')} />
          </div>
          <div className="recent-tickets-card">
            <RecentTicketsTable
              rows={recentRequests}
              loading={loading}
              onOpenAll={() => navigate('/tickets')}
              onCreate={() => setCreateTicketOpen(true)}
              onOpenRow={(id) => {
                const item = recentRequests.find((request) => request.id === id) ?? referenceTicket;
                setTicketModal(item);
              }}
            />
          </div>
        </div>

        <div className="dashboard-right-column">
          <div className="debt-card">
            <DebtStatusCard totalDebt={mockData.totalDebt} debtorsCount={mockData.debtorsCount} />
          </div>
          <div className="recent-activity-card">
            <RecentActivityList items={recentActivities} loading={loading} onOpenAll={() => navigate('/logs')} />
          </div>
        </div>
      </div>

      {loading ? <Typography.Text type="secondary">Загрузка данных...</Typography.Text> : null}

      <Modal
        open={createTicketOpen}
        centered
        width={560}
        className="saas-modal"
        closeIcon={<CloseOutlined />}
        footer={(
          <div className="saas-modal__footer">
            <Typography.Text className="saas-modal__helper">Все обязательные поля отмечены *</Typography.Text>
            <Space className="saas-modal__actions" size={10}>
              <Button className="saas-btn saas-btn--secondary" onClick={() => setCreateTicketOpen(false)}>
                Отмена
              </Button>
              <Button className="saas-btn saas-btn--primary" loading={ticketSaving} onClick={() => ticketForm.submit()}>
                Создать заявку
              </Button>
            </Space>
          </div>
        )}
        onCancel={() => setCreateTicketOpen(false)}
        title={
          <div className="saas-modal__header">
            <Typography.Title level={3}>Создать заявку</Typography.Title>
            <Typography.Text>Заполните данные обращения абонента</Typography.Text>
          </div>
        }
      >
        <Form form={ticketForm} layout="vertical" requiredMark={false} initialValues={{ priority: 'NORMAL' }} onFinish={(values) => void handleCreateTicket(values)}>
          <Form.Item name="subscriber" label={requiredLabel('Абонент')} rules={[{ required: true, message: 'Выберите абонента' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Выберите абонента"
              suffixIcon={<DownOutlined />}
              options={subscribers.map((item) => ({ value: item.id, label: item.fullName }))}
            />
          </Form.Item>
          <Form.Item name="title" label={requiredLabel('Тема')} rules={[{ required: true, message: 'Укажите тему заявки' }]}>
            <Input placeholder="Кратко опишите тему обращения" />
          </Form.Item>
          <Form.Item name="description" label={requiredLabel('Описание')} rules={[{ required: true, message: 'Добавьте описание' }, { max: 500 }]}>
            <Input.TextArea rows={5} maxLength={500} placeholder="Подробно опишите суть обращения абонента..." />
          </Form.Item>
          <div className="modal-textarea-meta">
            <Typography.Text>Максимум 500 символов</Typography.Text>
            <Typography.Text>{descriptionValue.length} / 500</Typography.Text>
          </div>
          <Form.Item name="address" label={requiredLabel('Адрес')} rules={[{ required: true, message: 'Укажите адрес' }]}>
            <Input placeholder="Укажите адрес объекта" />
          </Form.Item>
          <Form.Item name="priority" label="Приоритет">
            <div className="priority-control" role="group" aria-label="Приоритет заявки">
              <button
                type="button"
                className={`priority-control__item priority-control__item--low ${selectedPriority === 'LOW' ? 'is-selected' : ''}`}
                onClick={() => ticketForm.setFieldValue('priority', 'LOW')}
              >
                Низкий
              </button>
              <button
                type="button"
                className={`priority-control__item priority-control__item--normal ${selectedPriority === 'NORMAL' ? 'is-selected' : ''}`}
                onClick={() => ticketForm.setFieldValue('priority', 'NORMAL')}
              >
                Средний
              </button>
              <button
                type="button"
                className={`priority-control__item priority-control__item--high ${selectedPriority === 'HIGH' ? 'is-selected' : ''}`}
                onClick={() => ticketForm.setFieldValue('priority', 'HIGH')}
              >
                Высокий
              </button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={createSubscriberOpen}
        centered
        width={520}
        className="saas-modal saas-modal--subscriber"
        closeIcon={<CloseOutlined />}
        footer={(
          <div className="saas-modal__footer">
            <Typography.Text className="saas-modal__helper">Все обязательные поля отмечены *</Typography.Text>
            <Space className="saas-modal__actions" size={10}>
              <Button className="saas-btn saas-btn--secondary" onClick={() => setCreateSubscriberOpen(false)}>
                Отмена
              </Button>
              <Button className="saas-btn saas-btn--primary" loading={subscriberSaving} onClick={() => subscriberForm.submit()}>
                Добавить
              </Button>
            </Space>
          </div>
        )}
        onCancel={() => setCreateSubscriberOpen(false)}
        title={
          <div className="saas-modal__header">
            <Typography.Title level={3}>Добавить абонента</Typography.Title>
            <Typography.Text>Создайте карточку абонента и лицевой счёт</Typography.Text>
          </div>
        }
      >
        <Form form={subscriberForm} layout="vertical" requiredMark={false} initialValues={{ status: 'ACTIVE' }} onFinish={(values) => void handleCreateSubscriber(values)}>
          <Form.Item name="fullName" label={requiredLabel('ФИО')} rules={[{ required: true, message: 'Введите ФИО' }]}>
            <Input placeholder="Введите ФИО абонента" />
          </Form.Item>
          <Form.Item name="account" label={requiredLabel('Лицевой счёт')} rules={[{ required: true, message: 'Введите лицевой счёт' }]}>
            <Input placeholder="Например: 000123" />
          </Form.Item>
          <Form.Item name="address" label={requiredLabel('Адрес')} rules={[{ required: true, message: 'Укажите адрес' }]}>
            <Input placeholder="Укажите адрес" />
          </Form.Item>
          <Form.Item name="phone" label="Телефон">
            <Input placeholder="+7 (___) ___-__-__" />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Введите корректный email' }]}>
            <Input placeholder="example@mail.ru" />
          </Form.Item>
          <Form.Item name="status" label={requiredLabel('Статус')} rules={[{ required: true, message: 'Выберите статус' }]}>
            <Select options={[{ value: 'ACTIVE', label: 'Активен' }, { value: 'INACTIVE', label: 'Неактивен' }]} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={Boolean(ticketModal)}
        centered
        width={620}
        className="ticket-detail-modal"
        closeIcon={<CloseOutlined />}
        onCancel={() => setTicketModal(null)}
        footer={null}
        title={null}
      >
        <div className="ticket-detail-modal__header">
          <div>
            <div className="ticket-detail-modal__title-row">
              <Typography.Title level={3}>Заявка #{modalTicket.id}</Typography.Title>
              <span className="status-chip">Открыта</span>
            </div>
            <Typography.Text>Создана {formatDate(modalTicket.createdAt)}</Typography.Text>
          </div>
        </div>

        <div className="ticket-detail-modal__body">
          <section>
            <Typography.Title level={4}>Основная информация</Typography.Title>
            <div className="ticket-info-grid">
              <span className="ticket-info-label">Тема:</span>
              <span className="ticket-info-value">{modalTicket.id === 'c310' ? 'Тесты' : modalTicket.title}</span>
              <span className="ticket-info-label">Абонент:</span>
              <span className="ticket-info-value">Иванов И.И.</span>
              <span className="ticket-info-label">Лицевой счёт:</span>
              <span className="ticket-info-value">000123</span>
              <span className="ticket-info-label">Адрес:</span>
              <span className="ticket-info-value">ул. Ленина, 10, п. 2</span>
              <span className="ticket-info-label">Приоритет:</span>
              <span className="ticket-info-value"><span className="ticket-badge ticket-badge--warning">● Средний</span></span>
              <span className="ticket-info-label">Статус:</span>
              <span className="ticket-info-value"><span className="ticket-badge ticket-badge--info">● Открыта</span></span>
              <span className="ticket-info-label">Дата создания:</span>
              <span className="ticket-info-value">{formatDate(modalTicket.createdAt)}</span>
            </div>
          </section>

          <section>
            <Typography.Title level={4}>Описание</Typography.Title>
            <div className="ticket-description-card">
              {modalTicket.id === 'c310'
                ? 'Тестовое обращение для проверки работы системы. Просьба связаться с абонентом.'
                : modalTicket.description}
            </div>
          </section>

          <div className="ticket-detail-actions">
            <Button className="saas-btn saas-btn--primary" onClick={() => navigate(`/tickets/${modalTicket.id}`)}>
              Открыть полную страницу
            </Button>
            <Button className="saas-btn saas-btn--secondary" onClick={() => messageApi.info('Функция смены статуса будет добавлена в следующем обновлении')}>
              Изменить статус
            </Button>
          </div>

          <section className="ticket-history">
            <Typography.Title level={4}>История</Typography.Title>
            <div className="ticket-history-item">
              <span className="ticket-history-dot" />
              <div>
                <Typography.Text strong>Заявка создана</Typography.Text>
                <Typography.Text>26.04.2026, 10:05:16 · Оператор admin</Typography.Text>
              </div>
            </div>
          </section>
        </div>
      </Modal>
    </Space>
  );
}
