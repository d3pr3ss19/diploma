import {
  CheckCircleOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FileAddOutlined,
  LeftOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  RightOutlined,
  SearchOutlined,
  TeamOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import {
  Avatar,
  Button,
  Card,
  Dropdown,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { MenuProps } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractApiErrorMessage } from '../api/error';
import { createSubscriber, getSubscribers, updateSubscriber } from '../api/subscribers';
import type { Subscriber } from '../types/subscribers';

type SubscriberStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
type SubscriberRole = 'SUBSCRIBER' | 'OPERATOR' | 'ADMIN';
type SortValue = 'NEWEST' | 'OLDEST' | 'NAME_ASC' | 'NAME_DESC';
type PresetValue = 'ALL' | 'NEW' | 'WITH_TICKETS' | 'WITH_DEBT' | 'ACTIVE';

type SubscriberView = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  address: string;
  accountNumber: string;
  role: SubscriberRole;
  status: SubscriberStatus;
  createdAt: string;
  ticketsCount: number;
  debtAmount: number;
  isNew: boolean;
};

type SubscriberMeta = {
  email?: string;
  accountNumber?: string;
  role?: SubscriberRole;
  status?: SubscriberStatus;
};

type SubscriberCreateForm = {
  fullName: string;
  accountNumber: string;
  address: string;
  phone?: string;
  email?: string;
  status: SubscriberStatus;
};

type TicketCreateForm = {
  subscriberId: string;
  title: string;
  description: string;
  address: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH';
};

type SubscriberEditForm = {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  accountNumber: string;
  status: SubscriberStatus;
};

function normalizeRole(value?: string): SubscriberRole {
  if (value === 'ADMIN' || value === 'OPERATOR') {
    return value;
  }
  return 'SUBSCRIBER';
}

function roleLabel(role: SubscriberRole): string {
  if (role === 'ADMIN') return 'Администратор';
  if (role === 'OPERATOR') return 'Оператор';
  return 'Абонент';
}

function statusLabel(status: SubscriberStatus): string {
  if (status === 'ACTIVE') return 'Активен';
  if (status === 'INACTIVE') return 'Неактивен';
  return 'Архив';
}

function statusColor(status: SubscriberStatus): string {
  if (status === 'ACTIVE') return 'green';
  if (status === 'INACTIVE') return 'gold';
  return 'default';
}

function resolveStatus(subscriber: Subscriber, meta?: SubscriberMeta): SubscriberStatus {
  if (meta?.status) return meta.status;
  if (subscriber.user?.deletedAt) return 'ARCHIVED';
  if (subscriber.user?.isActual === false) return 'INACTIVE';
  return 'ACTIVE';
}

function deriveEmail(subscriber: Subscriber, meta?: SubscriberMeta): string {
  if (meta?.email) return meta.email;
  const safeName = subscriber.fullName.toLowerCase().replace(/[^a-zа-я0-9]+/gi, '.').replace(/^\.|\.$/g, '');
  return `${safeName || 'subscriber'}@mail.ru`;
}

function deriveAccountNumber(subscriber: Subscriber, meta?: SubscriberMeta): string {
  return meta?.accountNumber ?? subscriber.accounts?.[0]?.accountNumber ?? subscriber.id.slice(0, 6).padStart(6, '0');
}

function toCsvValue(value: string | number): string {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadCsv(filename: string, rows: SubscriberView[]) {
  const headers = ['ФИО', 'Телефон', 'Email', 'Адрес', 'Лицевой счёт', 'Роль', 'Статус', 'Заявок создано', 'Задолженность'];
  const content = [
    headers.join(','),
    ...rows.map((row) =>
      [
        row.fullName,
        row.phone,
        row.email,
        row.address,
        row.accountNumber,
        roleLabel(row.role),
        statusLabel(row.status),
        row.ticketsCount,
        `${row.debtAmount} ₽`,
      ]
        .map(toCsvValue)
        .join(','),
    ),
  ].join('\n');

  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

export function SubscribersPage() {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [items, setItems] = useState<Subscriber[]>([]);
  const [metaById, setMetaById] = useState<Record<string, SubscriberMeta>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | SubscriberStatus>('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | SubscriberRole>('ALL');
  const [sort, setSort] = useState<SortValue>('NEWEST');
  const [preset, setPreset] = useState<PresetValue>('ALL');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const [subscriberModalOpen, setSubscriberModalOpen] = useState(false);
  const [selectedSubscriber, setSelectedSubscriber] = useState<SubscriberView | null>(null);
  const [editingSubscriber, setEditingSubscriber] = useState(false);

  const [createSubscriberOpen, setCreateSubscriberOpen] = useState(false);
  const [createTicketOpen, setCreateTicketOpen] = useState(false);
  const [savingSubscriber, setSavingSubscriber] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [createForm] = Form.useForm<SubscriberCreateForm>();
  const [ticketForm] = Form.useForm<TicketCreateForm>();
  const [editForm] = Form.useForm<SubscriberEditForm>();

  useEffect(() => {
    async function loadSubscribers() {
      try {
        setLoading(true);
        setError(null);
        const data = await getSubscribers();
        setItems(data);
      } catch (err) {
        setError(extractApiErrorMessage(err, 'Не удалось загрузить абонентов.'));
      } finally {
        setLoading(false);
      }
    }

    void loadSubscribers();
  }, []);

  const subscribers = useMemo<SubscriberView[]>(() => {
    return items.map((subscriber) => {
      const meta = metaById[subscriber.id];
      const ticketsCount = (subscriber.accounts ?? []).reduce((sum, account) => sum + (account._count?.requests ?? 0), 0);
      const debtAmount = (subscriber.accounts ?? []).reduce((sum, account) => {
        const balance = Number(account.balance);
        return sum + (Number.isFinite(balance) && balance > 0 ? balance : 0);
      }, 0);
      const createdAtDate = new Date(subscriber.createdAt);
      const daysSinceCreate = (Date.now() - createdAtDate.getTime()) / (1000 * 60 * 60 * 24);

      return {
        id: subscriber.id,
        fullName: subscriber.fullName,
        phone: subscriber.phone ?? '—',
        email: deriveEmail(subscriber, meta),
        address: subscriber.address,
        accountNumber: deriveAccountNumber(subscriber, meta),
        role: meta?.role ?? normalizeRole(subscriber.user?.role?.code),
        status: resolveStatus(subscriber, meta),
        createdAt: subscriber.createdAt,
        ticketsCount,
        debtAmount,
        isNew: daysSinceCreate <= 14,
      };
    });
  }, [items, metaById]);

  const kpis = useMemo(() => {
    const total = subscribers.length;
    const active = subscribers.filter((item) => item.status === 'ACTIVE').length;
    const withTickets = subscribers.filter((item) => item.ticketsCount > 0).length;
    const totalDebt = subscribers.reduce((sum, item) => sum + item.debtAmount, 0);
    return { total, active, withTickets, totalDebt };
  }, [subscribers]);

  const filteredSubscribers = useMemo(() => {
    let list = [...subscribers];

    const query = search.trim().toLowerCase();
    if (query) {
      list = list.filter((item) =>
        [item.fullName, item.phone, item.email, item.address, item.accountNumber].join(' ').toLowerCase().includes(query),
      );
    }

    if (statusFilter !== 'ALL') {
      list = list.filter((item) => item.status === statusFilter);
    }

    if (roleFilter !== 'ALL') {
      list = list.filter((item) => item.role === roleFilter);
    }

    if (preset === 'NEW') {
      list = list.filter((item) => item.isNew);
    }
    if (preset === 'WITH_TICKETS') {
      list = list.filter((item) => item.ticketsCount > 0);
    }
    if (preset === 'WITH_DEBT') {
      list = list.filter((item) => item.debtAmount > 0);
    }
    if (preset === 'ACTIVE') {
      list = list.filter((item) => item.status === 'ACTIVE');
    }

    return list.sort((a, b) => {
      if (sort === 'NAME_ASC') return a.fullName.localeCompare(b.fullName, 'ru');
      if (sort === 'NAME_DESC') return b.fullName.localeCompare(a.fullName, 'ru');
      if (sort === 'OLDEST') return Date.parse(a.createdAt) - Date.parse(b.createdAt);
      return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    });
  }, [subscribers, search, statusFilter, roleFilter, preset, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredSubscribers.length / pageSize));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const pagedSubscribers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSubscribers.slice(start, start + pageSize);
  }, [filteredSubscribers, page, pageSize]);

  function resetFilters() {
    setSearch('');
    setStatusFilter('ALL');
    setRoleFilter('ALL');
    setSort('NEWEST');
    setPreset('ALL');
    setPage(1);
  }

  function openSubscriber(subscriber: SubscriberView) {
    setSelectedSubscriber(subscriber);
    setEditingSubscriber(false);
    editForm.setFieldsValue({
      fullName: subscriber.fullName,
      phone: subscriber.phone === '—' ? '' : subscriber.phone,
      email: subscriber.email,
      address: subscriber.address,
      accountNumber: subscriber.accountNumber,
      status: subscriber.status,
    });
    setSubscriberModalOpen(true);
  }

  function openCreateTicketForSubscriber(subscriber: SubscriberView) {
    setCreateTicketOpen(true);
    ticketForm.setFieldsValue({
      subscriberId: subscriber.id,
      title: '',
      description: '',
      address: subscriber.address,
      priority: 'NORMAL',
    });
  }

  async function handleSaveSubscriber(values: SubscriberEditForm) {
    if (!selectedSubscriber) return;

    try {
      setSavingProfile(true);
      await updateSubscriber(selectedSubscriber.id, {
        fullName: values.fullName,
        phone: values.phone,
        address: values.address,
      });
      setMetaById((prev) => ({
        ...prev,
        [selectedSubscriber.id]: {
          ...prev[selectedSubscriber.id],
          email: values.email,
          accountNumber: values.accountNumber,
          status: values.status,
        },
      }));
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedSubscriber.id
            ? {
                ...item,
                fullName: values.fullName,
                phone: values.phone,
                address: values.address,
                user: item.user ? { ...item.user, isActual: values.status === 'ACTIVE' } : item.user,
              }
            : item,
        ),
      );
      messageApi.success('Карточка абонента обновлена');
      setEditingSubscriber(false);
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Не удалось сохранить изменения абонента.'));
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleCreateSubscriber(values: SubscriberCreateForm) {
    try {
      setSavingSubscriber(true);
      const created = await createSubscriber({
        fullName: values.fullName,
        phone: values.phone ?? '',
        address: values.address,
      });
      setItems((prev) => [created, ...prev]);
      setMetaById((prev) => ({
        ...prev,
        [created.id]: {
          email: values.email || deriveEmail(created),
          accountNumber: values.accountNumber,
          status: values.status,
          role: 'SUBSCRIBER',
        },
      }));
      setCreateSubscriberOpen(false);
      createForm.resetFields();
      messageApi.success('Абонент добавлен');
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Не удалось создать абонента.'));
    } finally {
      setSavingSubscriber(false);
    }
  }

  function handleExportAllCsv() {
    downloadCsv(`subscribers-${new Date().getFullYear()}.csv`, subscribers);
    messageApi.success('Экспорт CSV выполнен');
  }

  function handleExportFilteredCsv() {
    downloadCsv(`subscribers-filtered-${new Date().getFullYear()}.csv`, filteredSubscribers);
    messageApi.success('Экспорт текущей выборки выполнен');
  }

  const exportMenuItems: MenuProps['items'] = [
    { key: 'csv', label: 'Экспорт в CSV', onClick: handleExportAllCsv },
    {
      key: 'xlsx',
      label: 'Экспорт в XLSX',
      onClick: () => messageApi.info('Экспорт в XLSX будет доступен после подключения модуля отчётов'),
    },
    { key: 'filtered', label: 'Экспорт текущей выборки', onClick: handleExportFilteredCsv },
  ];

  const rowMenu = (subscriber: SubscriberView): MenuProps['items'] => [
    { key: 'open', icon: <EyeOutlined />, label: 'Открыть карточку', onClick: () => openSubscriber(subscriber) },
    { key: 'ticket', icon: <FileAddOutlined />, label: 'Создать заявку', onClick: () => openCreateTicketForSubscriber(subscriber) },
    { key: 'edit', icon: <EditOutlined />, label: 'Редактировать', onClick: () => { openSubscriber(subscriber); setEditingSubscriber(true); } },
    {
      key: 'archive',
      label: 'Архивировать',
      onClick: () => {
        setMetaById((prev) => ({ ...prev, [subscriber.id]: { ...prev[subscriber.id], status: 'ARCHIVED' } }));
        messageApi.success('Абонент перемещён в архив');
      },
    },
  ];

  return (
    <div className="subscribers-page">
      {contextHolder}

      <div className="subscribers-page__header">
        <div>
          <Typography.Title level={1} className="subscribers-page__title">Абоненты</Typography.Title>
          <Typography.Text className="subscribers-page__subtitle">Управление абонентской базой, лицевыми счетами и обращениями</Typography.Text>
        </div>

        <Space size={10}>
          <Dropdown menu={{ items: exportMenuItems }} trigger={['click']}>
            <Button className="subscribers-btn subscribers-btn--secondary" icon={<DownloadOutlined />}>
              Экспорт
            </Button>
          </Dropdown>
          <Button className="subscribers-btn subscribers-btn--primary" icon={<PlusOutlined />} onClick={() => setCreateSubscriberOpen(true)}>
            Добавить абонента
          </Button>
        </Space>
      </div>

      <div className="subscribers-kpi-grid">
        <Card className="subscribers-kpi-card">
          <div className="subscribers-kpi-card__icon subscribers-kpi-card__icon--blue"><TeamOutlined /></div>
          <div>
            <Typography.Text className="subscribers-kpi-card__title">Всего абонентов</Typography.Text>
            <Typography.Title level={2} className="subscribers-kpi-card__value">{kpis.total}</Typography.Title>
            <Typography.Text className="subscribers-kpi-card__caption">в базе</Typography.Text>
          </div>
        </Card>

        <Card className="subscribers-kpi-card">
          <div className="subscribers-kpi-card__icon subscribers-kpi-card__icon--green"><CheckCircleOutlined /></div>
          <div>
            <Typography.Text className="subscribers-kpi-card__title">Активные</Typography.Text>
            <Typography.Title level={2} className="subscribers-kpi-card__value">{kpis.active}</Typography.Title>
            <Typography.Text className="subscribers-kpi-card__caption subscribers-kpi-card__caption--success">
              {kpis.total ? `${Math.round((kpis.active / kpis.total) * 100)}% от базы` : '0% от базы'}
            </Typography.Text>
          </div>
        </Card>

        <Card className="subscribers-kpi-card">
          <div className="subscribers-kpi-card__icon subscribers-kpi-card__icon--orange"><FileAddOutlined /></div>
          <div>
            <Typography.Text className="subscribers-kpi-card__title">С заявками</Typography.Text>
            <Typography.Title level={2} className="subscribers-kpi-card__value">{kpis.withTickets}</Typography.Title>
            <Typography.Text className="subscribers-kpi-card__caption">есть обращения</Typography.Text>
          </div>
        </Card>

        <Card className="subscribers-kpi-card">
          <div className="subscribers-kpi-card__icon subscribers-kpi-card__icon--green"><WalletOutlined /></div>
          <div>
            <Typography.Text className="subscribers-kpi-card__title">Задолженность</Typography.Text>
            <Typography.Title level={2} className="subscribers-kpi-card__value">{kpis.totalDebt.toLocaleString('ru-RU')} ₽</Typography.Title>
            <Typography.Text className="subscribers-kpi-card__caption subscribers-kpi-card__caption--success">нет просрочек</Typography.Text>
          </div>
        </Card>
      </div>

      <Card className="subscribers-filters-card">
        <div className="subscribers-filters-row">
          <Input
            className="subscribers-search"
            size="large"
            placeholder="Поиск по ФИО, адресу, телефону..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <Select value={statusFilter} size="large" style={{ width: 170 }} onChange={(value) => { setStatusFilter(value); setPage(1); }} options={[
            { value: 'ALL', label: 'Статус: все' },
            { value: 'ACTIVE', label: 'Активен' },
            { value: 'INACTIVE', label: 'Неактивен' },
            { value: 'ARCHIVED', label: 'Архив' },
          ]} />
          <Select value={roleFilter} size="large" style={{ width: 180 }} onChange={(value) => { setRoleFilter(value); setPage(1); }} options={[
            { value: 'ALL', label: 'Роль: все' },
            { value: 'SUBSCRIBER', label: 'Абонент' },
            { value: 'OPERATOR', label: 'Оператор' },
            { value: 'ADMIN', label: 'Администратор' },
          ]} />
          <Select value={sort} size="large" style={{ width: 180 }} onChange={(value) => setSort(value)} options={[
            { value: 'NEWEST', label: 'Сначала новые' },
            { value: 'OLDEST', label: 'Сначала старые' },
            { value: 'NAME_ASC', label: 'ФИО: А-Я' },
            { value: 'NAME_DESC', label: 'ФИО: Я-А' },
          ]} />
          <Button className="subscribers-btn subscribers-btn--secondary" icon={<ReloadOutlined />} onClick={resetFilters}>Сбросить</Button>
        </div>

        <div className="subscribers-presets-row">
          {[
            { key: 'ALL', label: 'Все' },
            { key: 'NEW', label: 'Новые' },
            { key: 'WITH_TICKETS', label: 'С заявками' },
            { key: 'WITH_DEBT', label: 'С задолженностью' },
            { key: 'ACTIVE', label: 'Активные' },
          ].map((item) => (
            <Button
              key={item.key}
              className={`subscribers-preset ${preset === item.key ? 'is-active' : ''}`}
              onClick={() => {
                setPreset(item.key as PresetValue);
                setPage(1);
              }}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </Card>

      {error ? <Card className="subscribers-table-card"><Typography.Text type="danger">{error}</Typography.Text></Card> : null}

      <Card className="subscribers-table-card" bodyStyle={{ padding: 0 }}>
        <div className="subscribers-table-card__header">
          <Typography.Title level={4}>Список абонентов</Typography.Title>
          <Typography.Text>Показано {filteredSubscribers.length} из {subscribers.length}</Typography.Text>
        </div>

        {filteredSubscribers.length === 0 ? (
          <div className="subscribers-table-empty">
            <Empty
              description={
                search || statusFilter !== 'ALL' || roleFilter !== 'ALL' || preset !== 'ALL'
                  ? 'По вашему запросу ничего не найдено. Попробуйте изменить параметры поиска.'
                  : 'Абоненты не найдены. Измените фильтры или добавьте нового абонента.'
              }
            >
              <Button onClick={search || statusFilter !== 'ALL' || roleFilter !== 'ALL' || preset !== 'ALL' ? resetFilters : () => setCreateSubscriberOpen(true)}>
                {search || statusFilter !== 'ALL' || roleFilter !== 'ALL' || preset !== 'ALL' ? 'Сбросить фильтры' : 'Добавить абонента'}
              </Button>
            </Empty>
          </div>
        ) : (
          <>
            <Table
              rowKey="id"
              dataSource={pagedSubscribers}
              pagination={false}
              className="subscribers-table"
              onRow={(record) => ({ onClick: () => openSubscriber(record) })}
              columns={[
                {
                  title: 'Абонент',
                  key: 'subscriber',
                  render: (_: unknown, row: SubscriberView) => (
                    <Space>
                      <Avatar className="subscribers-avatar">{row.fullName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</Avatar>
                      <div>
                        <Typography.Text strong>{row.fullName}</Typography.Text>
                        <Typography.Text type="secondary" className="subscribers-cell-caption">{row.isNew ? 'Добавлена недавно' : 'Абонент'}</Typography.Text>
                      </div>
                    </Space>
                  ),
                },
                {
                  title: 'Контакты',
                  key: 'contacts',
                  render: (_: unknown, row: SubscriberView) => (
                    <div>
                      <Typography.Text>{row.phone}</Typography.Text>
                      <Typography.Text type="secondary" className="subscribers-cell-caption">{row.email}</Typography.Text>
                    </div>
                  ),
                },
                {
                  title: 'Адрес',
                  dataIndex: 'address',
                  key: 'address',
                  render: (value: string) => <Typography.Text className="subscribers-address-cell">{value}</Typography.Text>,
                },
                {
                  title: 'Лицевой счёт',
                  dataIndex: 'accountNumber',
                  key: 'accountNumber',
                  render: (value: string) => <span className="account-chip">{value}</span>,
                },
                {
                  title: 'Заявки',
                  key: 'tickets',
                  render: (_: unknown, row: SubscriberView) =>
                    row.ticketsCount > 0 ? <Tag color="gold">{row.ticketsCount} заявка</Tag> : <Typography.Text type="secondary">0</Typography.Text>,
                },
                {
                  title: 'Задолженность',
                  key: 'debt',
                  render: (_: unknown, row: SubscriberView) => (
                    <div>
                      <Typography.Text strong style={{ color: row.debtAmount > 0 ? '#DC2626' : '#111827' }}>{row.debtAmount.toLocaleString('ru-RU')} ₽</Typography.Text>
                      <Typography.Text type="secondary" className="subscribers-cell-caption">{row.debtAmount > 0 ? 'есть задолженность' : 'нет долга'}</Typography.Text>
                    </div>
                  ),
                },
                {
                  title: 'Статус',
                  key: 'status',
                  render: (_: unknown, row: SubscriberView) => <Tag color={statusColor(row.status)}>{statusLabel(row.status)}</Tag>,
                },
                {
                  title: 'Действия',
                  key: 'actions',
                  render: (_: unknown, row: SubscriberView) => (
                    <Space>
                      <Button size="small" onClick={(event) => { event.stopPropagation(); openSubscriber(row); }}>Открыть</Button>
                      <Dropdown menu={{ items: rowMenu(row) }} trigger={['click']}>
                        <Button size="small" icon={<MoreOutlined />} onClick={(event) => event.stopPropagation()} aria-label="Меню действий" />
                      </Dropdown>
                    </Space>
                  ),
                },
              ]}
            />

            <div className="subscribers-table-pagination">
              <Space>
                <Typography.Text>Показывать по</Typography.Text>
                <Select value={pageSize} style={{ width: 86 }} onChange={(value) => { setPageSize(value); setPage(1); }} options={[
                  { value: 10, label: '10' },
                  { value: 25, label: '25' },
                  { value: 50, label: '50' },
                ]} />
              </Space>

              <Space>
                <Button icon={<LeftOutlined />} disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))} />
                <Button type="primary">{page}</Button>
                <Button icon={<RightOutlined />} disabled={page >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} />
                <Typography.Text>Страница {page} из {totalPages}</Typography.Text>
              </Space>
            </div>
          </>
        )}
      </Card>

      <Modal
        open={subscriberModalOpen}
        centered
        width={620}
        className="ticket-detail-modal"
        footer={null}
        onCancel={() => {
          setSubscriberModalOpen(false);
          setSelectedSubscriber(null);
          setEditingSubscriber(false);
        }}
      >
        {selectedSubscriber ? (
          <>
            <div className="ticket-detail-modal__header">
              <div>
                <div className="ticket-detail-modal__title-row">
                  <Typography.Title level={3}>Карточка абонента</Typography.Title>
                  <span className="status-chip">{statusLabel(selectedSubscriber.status)}</span>
                </div>
                <Typography.Text className="ticket-detail-modal__subtitle">{selectedSubscriber.fullName}</Typography.Text>
              </div>
            </div>

            <div className="ticket-detail-modal__body">
              {editingSubscriber ? (
                <Form form={editForm} layout="vertical" onFinish={(values) => void handleSaveSubscriber(values)}>
                  <Form.Item name="fullName" label="ФИО" rules={[{ required: true }]}><Input /></Form.Item>
                  <Form.Item name="accountNumber" label="Лицевой счёт" rules={[{ required: true }]}><Input /></Form.Item>
                  <Form.Item name="phone" label="Телефон"><Input /></Form.Item>
                  <Form.Item name="email" label="Email" rules={[{ type: 'email' }]}><Input /></Form.Item>
                  <Form.Item name="address" label="Адрес" rules={[{ required: true }]}><Input /></Form.Item>
                  <Form.Item name="status" label="Статус"><Select options={[
                    { value: 'ACTIVE', label: 'Активен' },
                    { value: 'INACTIVE', label: 'Неактивен' },
                    { value: 'ARCHIVED', label: 'Архив' },
                  ]} /></Form.Item>
                  <Space>
                    <Button onClick={() => setEditingSubscriber(false)}>Отмена</Button>
                    <Button type="primary" htmlType="submit" loading={savingProfile}>Сохранить</Button>
                  </Space>
                </Form>
              ) : (
                <>
                  <section>
                    <Typography.Title level={4}>Основная информация</Typography.Title>
                    <div className="ticket-info-grid">
                      <span className="ticket-info-label">ФИО:</span><span className="ticket-info-value">{selectedSubscriber.fullName}</span>
                      <span className="ticket-info-label">Лицевой счёт:</span><span className="ticket-info-value">{selectedSubscriber.accountNumber}</span>
                      <span className="ticket-info-label">Телефон:</span><span className="ticket-info-value">{selectedSubscriber.phone}</span>
                      <span className="ticket-info-label">Email:</span><span className="ticket-info-value">{selectedSubscriber.email}</span>
                      <span className="ticket-info-label">Адрес:</span><span className="ticket-info-value">{selectedSubscriber.address}</span>
                    </div>
                  </section>

                  <section>
                    <Typography.Title level={4}>Показатели</Typography.Title>
                    <div className="ticket-info-grid">
                      <span className="ticket-info-label">Заявок создано:</span><span className="ticket-info-value">{selectedSubscriber.ticketsCount}</span>
                      <span className="ticket-info-label">Задолженность:</span><span className="ticket-info-value">{selectedSubscriber.debtAmount.toLocaleString('ru-RU')} ₽</span>
                      <span className="ticket-info-label">Статус:</span><span className="ticket-info-value">нет просрочек</span>
                    </div>
                  </section>

                  <div className="ticket-detail-actions">
                    <Button className="saas-btn saas-btn--primary" onClick={() => openCreateTicketForSubscriber(selectedSubscriber)}>Создать заявку</Button>
                    <Button className="saas-btn saas-btn--secondary" onClick={() => navigate('/billing')}>Принять оплату</Button>
                    <Button className="saas-btn saas-btn--secondary" onClick={() => setEditingSubscriber(true)}>Редактировать</Button>
                  </div>
                </>
              )}
            </div>
          </>
        ) : null}
      </Modal>

      <Modal
        open={createSubscriberOpen}
        centered
        width={520}
        className="saas-modal"
        onCancel={() => setCreateSubscriberOpen(false)}
        footer={(
          <div className="saas-modal__footer">
            <Typography.Text className="saas-modal__helper">Все обязательные поля отмечены *</Typography.Text>
            <Space className="saas-modal__actions" size={10}>
              <Button className="saas-btn saas-btn--secondary" onClick={() => setCreateSubscriberOpen(false)}>Отмена</Button>
              <Button className="saas-btn saas-btn--primary" loading={savingSubscriber} onClick={() => createForm.submit()}>Добавить</Button>
            </Space>
          </div>
        )}
        title={
          <div className="saas-modal__header">
            <Typography.Title level={3}>Добавить абонента</Typography.Title>
            <Typography.Text>Создайте карточку абонента и лицевой счёт</Typography.Text>
          </div>
        }
      >
        <Form form={createForm} layout="vertical" requiredMark={false} initialValues={{ status: 'ACTIVE' }} onFinish={(values) => void handleCreateSubscriber(values)}>
          <Form.Item name="fullName" label="ФИО *" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="accountNumber" label="Лицевой счёт *" rules={[{ required: true }]}><Input placeholder="000123" /></Form.Item>
          <Form.Item name="address" label="Адрес *" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="phone" label="Телефон"><Input /></Form.Item>
          <Form.Item name="email" label="Email" rules={[{ type: 'email' }]}><Input /></Form.Item>
          <Form.Item name="status" label="Статус *" rules={[{ required: true }]}><Select options={[
            { value: 'ACTIVE', label: 'Активен' },
            { value: 'INACTIVE', label: 'Неактивен' },
            { value: 'ARCHIVED', label: 'Архив' },
          ]} /></Form.Item>
        </Form>
      </Modal>

      <Modal
        open={createTicketOpen}
        centered
        width={560}
        className="saas-modal"
        onCancel={() => setCreateTicketOpen(false)}
        footer={(
          <div className="saas-modal__footer">
            <Typography.Text className="saas-modal__helper">Все обязательные поля отмечены *</Typography.Text>
            <Space className="saas-modal__actions" size={10}>
              <Button className="saas-btn saas-btn--secondary" onClick={() => setCreateTicketOpen(false)}>Отмена</Button>
              <Button className="saas-btn saas-btn--primary" onClick={() => { ticketForm.submit(); }}>Создать заявку</Button>
            </Space>
          </div>
        )}
        title={<div className="saas-modal__header"><Typography.Title level={3}>Создать заявку</Typography.Title><Typography.Text>Заполните данные обращения абонента</Typography.Text></div>}
      >
        <Form
          form={ticketForm}
          layout="vertical"
          onFinish={() => {
            setCreateTicketOpen(false);
            messageApi.success('Заявка создана');
          }}
        >
          <Form.Item name="subscriberId" label="Абонент" rules={[{ required: true }]}>
            <Select
              options={subscribers.map((item) => ({ value: item.id, label: `${item.fullName} (${item.accountNumber})` }))}
            />
          </Form.Item>
          <Form.Item name="title" label="Тема" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="Описание" rules={[{ required: true }]}><Input.TextArea rows={4} /></Form.Item>
          <Form.Item name="address" label="Адрес" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="priority" label="Приоритет" initialValue="NORMAL"><Select options={[
            { value: 'LOW', label: 'Низкий' },
            { value: 'NORMAL', label: 'Средний' },
            { value: 'HIGH', label: 'Высокий' },
          ]} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
