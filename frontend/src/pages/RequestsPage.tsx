import { Alert, Button, Card, Descriptions, Form, Input, List, Modal, Pagination, Select, Space, Tag, Typography, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { extractApiErrorMessage } from '../api/error';
import { createRequest, getRequestHistory, getRequests, updateRequest } from '../api/requests';
import { getMySubscriber, getSubscriberById, getSubscribers } from '../api/subscribers';
import { readAuth } from '../app/auth-storage';
import type { RequestHistoryItem, ServiceRequest } from '../types/requests';
import type { Subscriber } from '../types/subscribers';
import { filterRequests, paginate, sortRequests, type RequestSort, type RequestStatusFilter } from '../utils/list-filters';
import { buildRequestsPresetQuery, hasActiveQuery, withUpdatedParam } from '../utils/list-query-state';

type CreateRequestForm = {
  subscriberId?: string;
  accountId: string;
  title: string;
  description: string;
  category: 'ACCIDENT' | 'COMPLAINT' | 'QUESTION';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  contactPhone?: string;
  preferredVisitAt?: string;
  assignedToUserId?: string;
};

type EditRequestForm = {
  title: string;
  description: string;
  category: 'ACCIDENT' | 'COMPLAINT' | 'QUESTION';
  status: 'NEW' | 'IN_PROGRESS' | 'DONE' | 'REJECTED';
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  contactPhone?: string;
  preferredVisitAt?: string;
  assignedToUserId?: string;
  comment?: string;
};

type AccountOption = {
  value: string;
  label: string;
};

const userIdRule = {
  pattern: /^\d+$/,
  message: 'Введите числовой ID пользователя',
};

const PAGE_SIZE = 10;
const REQUESTS_PRESET_KEY = 'requests-last-preset';


function statusColor(status: string): string {
  if (status === 'NEW') return 'blue';
  if (status === 'IN_PROGRESS') return 'gold';
  if (status === 'DONE') return 'green';
  if (status === 'REJECTED') return 'red';
  return 'default';
}

function statusLabel(status: string): string {
  if (status === 'NEW') return 'Новая';
  if (status === 'IN_PROGRESS') return 'В работе';
  if (status === 'DONE') return 'Выполнена';
  if (status === 'REJECTED') return 'Отклонена';
  return status;
}

function categoryLabel(category: string): string {
  if (category === 'ACCIDENT') return 'Авария';
  if (category === 'COMPLAINT') return 'Жалоба';
  if (category === 'QUESTION') return 'Вопрос';
  return category;
}

function priorityLabel(priority?: string): string {
  if (priority === 'LOW') return 'Низкий';
  if (priority === 'HIGH') return 'Высокий';
  if (priority === 'URGENT') return 'Аварийный';
  return 'Обычный';
}

export function RequestsPage() {
  const [items, setItems] = useState<ServiceRequest[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [accountOptions, setAccountOptions] = useState<AccountOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<ServiceRequest | null>(null);
  const [authorModalOpen, setAuthorModalOpen] = useState(false);
  const [authorRequest, setAuthorRequest] = useState<ServiceRequest | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState<RequestHistoryItem[]>([]);
  const [historyRequest, setHistoryRequest] = useState<ServiceRequest | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewRequest, setViewRequest] = useState<ServiceRequest | null>(null);
  const [form] = Form.useForm<CreateRequestForm>();
  const [editForm] = Form.useForm<EditRequestForm>();
  const [messageApi, contextHolder] = message.useMessage();
  const [searchParams, setSearchParams] = useSearchParams();

  const auth = readAuth();
  const isAdmin = auth?.user.role === 'ADMIN';
  const isSubscriber = auth?.user.role === 'SUBSCRIBER';
  const canEditRequests = auth?.user.role === 'ADMIN' || auth?.user.role === 'OPERATOR';

  const statusFilter = (searchParams.get('status') as RequestStatusFilter | null) ?? 'ALL';
  const search = searchParams.get('q') ?? '';
  const sort = (searchParams.get('sort') as RequestSort | null) ?? 'newest';
  const currentPage = Number(searchParams.get('page') ?? '1') || 1;

  async function loadRequests() {
    try {
      setLoading(true);
      setError(null);
      const data = await getRequests();
      setItems(data);
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Не удалось загрузить заявки.'));
    } finally {
      setLoading(false);
    }
  }

  async function loadSubscribersList() {
    try {
      if (isSubscriber) {
        const me = await getMySubscriber();
        setSubscribers([me]);
        const options = me.accounts.map((account) => ({
          value: account.id,
          label: `${account.accountNumber}`,
        }));
        setAccountOptions(options);
        return;
      }

      const data = await getSubscribers();
      setSubscribers(data);
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Не удалось загрузить список абонентов.'));
    }
  }

  useEffect(() => {
    void loadRequests();
    void loadSubscribersList();
  }, []);

  useEffect(() => {
    if (hasActiveQuery(searchParams)) {
      return;
    }

    const savedPreset = localStorage.getItem(REQUESTS_PRESET_KEY) as 'open' | 'inProgress' | null;
    if (!savedPreset) {
      return;
    }

    setSearchParams(buildRequestsPresetQuery(savedPreset));
  }, [searchParams, setSearchParams]);

  const filteredItems = useMemo(
    () => sortRequests(filterRequests(items, search, statusFilter), sort),
    [items, search, sort, statusFilter],
  );

  const paginatedItems = useMemo(() => paginate(filteredItems, currentPage, PAGE_SIZE), [currentPage, filteredItems]);

  function updateParam(key: string, value: string) {
    setSearchParams(withUpdatedParam(searchParams, key, value));
  }

  function applyPreset(preset: 'open' | 'inProgress') {
    setSearchParams(buildRequestsPresetQuery(preset));
    localStorage.setItem(REQUESTS_PRESET_KEY, preset);
  }

  function resetFilters() {
    setSearchParams(new URLSearchParams());
    localStorage.removeItem(REQUESTS_PRESET_KEY);
  }

  function openCreateModal() {
    setModalOpen(true);
    if (isSubscriber && subscribers[0]) {
      setAccountOptions(
        (subscribers[0].accounts ?? []).map((account) => ({
          value: account.id,
          label: `${account.accountNumber ?? 'Лицевой счёт'}`,
        }))
      );
    } else {
      setAccountOptions([]);
    }
    form.setFieldsValue({
      category: 'QUESTION',
      priority: 'NORMAL',
      contactPhone: undefined,
      preferredVisitAt: undefined,
      subscriberId: undefined,
      accountId: undefined,
      assignedToUserId: undefined,
    });
  }

  async function loadAccountsForSubscriber(subscriberId: string) {
    try {
      setLoadingAccounts(true);
      const subscriber = await getSubscriberById(subscriberId);
      const options = subscriber.accounts.map((account) => ({
        value: account.id,
        label: `${account.accountNumber}`,
      }));
      setAccountOptions(options);
      form.setFieldsValue({ accountId: undefined });

      if (!options.length) {
        messageApi.warning('У выбранного абонента нет лицевых счетов.');
      }
    } catch (err) {
      setAccountOptions([]);
      setError(extractApiErrorMessage(err, 'Не удалось загрузить лицевые счета абонента.'));
    } finally {
      setLoadingAccounts(false);
    }
  }

  async function handleCreate(values: CreateRequestForm) {
    try {
      setSaving(true);
      setError(null);
      await createRequest({
        accountId: values.accountId,
        title: values.title,
        description: values.description,
        category: values.category,
        priority: values.priority,
        contactPhone: values.contactPhone || undefined,
        preferredVisitAt: values.preferredVisitAt || undefined,
        assignedToUserId: values.assignedToUserId ? Number(values.assignedToUserId) : undefined,
      });
      setModalOpen(false);
      form.resetFields();
      messageApi.success('Заявка успешно создана');
      await loadRequests();
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Не удалось создать заявку. Проверьте введённые данные.'));
    } finally {
      setSaving(false);
    }
  }


  function openEditModal(request: ServiceRequest) {
    setEditingRequest(request);
    setEditModalOpen(true);
    editForm.setFieldsValue({
      title: request.title,
      description: request.description,
      category: request.category as EditRequestForm['category'],
      status: request.status as EditRequestForm['status'],
      priority: (request as any).priority as EditRequestForm['priority'],
      contactPhone: (request as any).contactPhone ?? undefined,
      preferredVisitAt: (request as any).preferredVisitAt ?? undefined,
      assignedToUserId: request.assignedToUserId ?? undefined,
      comment: ''
    });
  }

  function openViewModal(request: ServiceRequest) {
    setViewRequest(request);
    setViewModalOpen(true);
  }

  async function handleUpdate(values: EditRequestForm) {
    if (!editingRequest) return;

    try {
      setSaving(true);
      setError(null);
      await updateRequest(editingRequest.id, {
        title: values.title,
        description: values.description,
        category: values.category,
        status: values.status,
        priority: values.priority,
        contactPhone: values.contactPhone || undefined,
        preferredVisitAt: values.preferredVisitAt || undefined,
        assignedToUserId: values.assignedToUserId ? Number(values.assignedToUserId) : null,
        comment: values.comment || ''
      });
      messageApi.success('Заявка обновлена');
      setEditModalOpen(false);
      setEditingRequest(null);
      await loadRequests();
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Не удалось обновить заявку.'));
    } finally {
      setSaving(false);
    }
  }


  function openAuthorProfile(request: ServiceRequest) {
    setAuthorRequest(request);
    setAuthorModalOpen(true);
  }


  async function openHistory(request: ServiceRequest) {
    try {
      setHistoryRequest(request);
      setHistoryModalOpen(true);
      setHistoryLoading(true);
      const history = await getRequestHistory(request.id);
      setHistoryItems(history);
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Не удалось загрузить историю заявки.'));
      setHistoryItems([]);
    } finally {
      setHistoryLoading(false);
    }
  }


  return (
    <>
      {contextHolder}

      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space direction="vertical" size={2}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Заявки
          </Typography.Title>
          <Typography.Text type="secondary">Контролируйте обращения, статусы и приоритеты в одном экране.</Typography.Text>
        </Space>
        <Button type="primary" onClick={openCreateModal} size="large">
          Создать заявку
        </Button>
      </Space>

      <Card className="app-card-soft" style={{ marginBottom: 16 }}>
        <Space style={{ marginBottom: 12 }} wrap align="start">
          <Input.Search
            allowClear
            placeholder="Поиск по заголовку, описанию, категории"
            value={search}
            onChange={(event) => updateParam('q', event.target.value)}
            style={{ width: 340 }}
            size="large"
          />
          <Select
            value={statusFilter}
            onChange={(value) => updateParam('status', value)}
            style={{ width: 220 }}
            size="large"
            options={[
              { value: 'ALL', label: 'Все статусы' },
              { value: 'NEW', label: 'Новая' },
              { value: 'IN_PROGRESS', label: 'В работе' },
              { value: 'DONE', label: 'Выполнена' },
              { value: 'REJECTED', label: 'Отклонена' },
            ]}
          />
          <Select
            value={sort}
            onChange={(value) => updateParam('sort', value)}
            style={{ width: 200 }}
            size="large"
            options={[
              { value: 'newest', label: 'Сначала новые' },
              { value: 'oldest', label: 'Сначала старые' },
              { value: 'categoryAsc', label: 'Категория: А→Я' },
              { value: 'categoryDesc', label: 'Категория: Я→А' },
            ]}
          />
        </Space>

        <Space.Compact block>
          <Button size="large" onClick={() => applyPreset('open')}>
            Пресет: новые
          </Button>
          <Button size="large" onClick={() => applyPreset('inProgress')}>
            Пресет: в работе
          </Button>
          <Button size="large" onClick={resetFilters}>
            Сбросить фильтры
          </Button>
        </Space.Compact>
      </Card>

      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}

      <List
        bordered
        loading={loading}
        dataSource={paginatedItems}
        renderItem={(item) => (
          <List.Item>
            <Space direction="vertical" size={2}>
              <Typography.Text strong style={{ fontSize: 16 }}>{item.title}</Typography.Text>
              <Typography.Text type="secondary">{new Date(item.createdAt).toLocaleString('ru-RU')}</Typography.Text>
              <Space size={8} wrap>
                <Tag color="purple" style={{ fontSize: 13 }}>{categoryLabel(item.category)}</Tag>
                <Tag color="geekblue">{priorityLabel((item as any).priority)}</Tag>
                {item.createdByUser?.subscriber?.fullName ? (
                  <Typography.Link onClick={() => openAuthorProfile(item)}>
                    Автор: {item.createdByUser.subscriber.fullName}
                  </Typography.Link>
                ) : (
                  <Typography.Text type="secondary">Автор: {item.createdByUser?.email ?? item.createdByUserId}</Typography.Text>
                )}
              </Space>
            </Space>
            <Space style={{ marginLeft: 'auto' }}>
              <Tag color={statusColor(item.status)} style={{ fontSize: 14, paddingInline: 10, paddingBlock: 2 }}>{statusLabel(item.status)}</Tag>
              <Button size="large" onClick={() => openViewModal(item)}>Открыть</Button>
              <Button size="large" onClick={() => void openHistory(item)}>История</Button>
              {canEditRequests ? (
                <Button size="large" onClick={() => openEditModal(item)}>
                  Редактировать
                </Button>
              ) : null}
            </Space>
          </List.Item>
        )}
      />

      <Pagination
        current={currentPage}
        pageSize={PAGE_SIZE}
        total={filteredItems.length}
        showSizeChanger={false}
        onChange={(page) => updateParam('page', String(page))}
        style={{ marginTop: 16, textAlign: 'right' }}
      />

      <Modal
        open={modalOpen}
        title="Новая заявка"
        okText="Создать"
        cancelText="Отмена"
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          {!isSubscriber ? (
            <Form.Item
              label="Абонент"
              name="subscriberId"
              rules={[{ required: true, message: 'Выберите абонента' }]}
            >
              <Select
                showSearch
                placeholder="Выберите абонента"
                optionFilterProp="label"
                options={subscribers.map((subscriber) => ({ value: subscriber.id, label: subscriber.fullName }))}
                onChange={(value) => void loadAccountsForSubscriber(value)}
              />
            </Form.Item>
          ) : null}

          <Form.Item
            label="Лицевой счёт"
            name="accountId"
            rules={[{ required: true, message: 'Выберите лицевой счёт' }]}
          >
            <Select
              loading={loadingAccounts}
              placeholder={loadingAccounts ? 'Загружаем лицевые счета...' : 'Выберите лицевой счёт'}
              options={accountOptions}
              disabled={!isSubscriber && !form.getFieldValue('subscriberId')}
            />
          </Form.Item>

          <Form.Item label="Заголовок" name="title" rules={[{ required: true, min: 5, message: 'Минимум 5 символов' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            label="Описание"
            name="description"
            rules={[{ required: true, min: 10, message: 'Минимум 10 символов' }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="Категория" name="category" rules={[{ required: true, message: 'Выберите категорию' }]}>
            <Select
              options={[
                { value: 'ACCIDENT', label: 'Авария' },
                { value: 'COMPLAINT', label: 'Жалоба' },
                { value: 'QUESTION', label: 'Вопрос' },
              ]}
            />
          </Form.Item>


          <Form.Item label="Приоритет" name="priority" rules={[{ required: true, message: 'Выберите приоритет' }]}>
            <Select
              options={[
                { value: 'LOW', label: 'Низкий' },
                { value: 'NORMAL', label: 'Обычный' },
                { value: 'HIGH', label: 'Высокий' },
                { value: 'URGENT', label: 'Аварийный' },
              ]}
            />
          </Form.Item>
          <Form.Item label="Контактный телефон" name="contactPhone" rules={[{ pattern: /^\+7\d{10}$/, message: 'Формат: +7XXXXXXXXXX' }]}>
            <Input placeholder="+79001234567" />
          </Form.Item>
          <Form.Item label="Желаемая дата/время визита" name="preferredVisitAt">
            <Input type="datetime-local" />
          </Form.Item>
          {canEditRequests ? (
            <Form.Item label="Назначить на сотрудника (ID, опционально)" name="assignedToUserId" rules={[userIdRule]}>
              <Input />
            </Form.Item>
          ) : null}
        </Form>
      </Modal>


      <Modal
        open={editModalOpen}
        title="Редактировать заявку"
        okText="Сохранить"
        cancelText="Отмена"
        onCancel={() => {
          setEditModalOpen(false);
          setEditingRequest(null);
        }}
        onOk={() => editForm.submit()}
        confirmLoading={saving}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
          <Form.Item label="Заголовок" name="title" rules={[{ required: true, min: 5, message: 'Минимум 5 символов' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            label="Описание"
            name="description"
            rules={[{ required: true, min: 10, message: 'Минимум 10 символов' }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="Категория" name="category" rules={[{ required: true, message: 'Выберите категорию' }]}>
            <Select
              options={[
                { value: 'ACCIDENT', label: 'Авария' },
                { value: 'COMPLAINT', label: 'Жалоба' },
                { value: 'QUESTION', label: 'Вопрос' },
              ]}
            />
          </Form.Item>
          <Form.Item label="Статус" name="status" rules={[{ required: true, message: 'Выберите статус' }]}>
            <Select
              options={[
                { value: 'NEW', label: 'Новая' },
                { value: 'IN_PROGRESS', label: 'В работе' },
                { value: 'DONE', label: 'Выполнена' },
                { value: 'REJECTED', label: 'Отклонена' },
              ]}
            />
          </Form.Item>

          <Form.Item label="Приоритет" name="priority">
            <Select
              options={[
                { value: 'LOW', label: 'Низкий' },
                { value: 'NORMAL', label: 'Обычный' },
                { value: 'HIGH', label: 'Высокий' },
                { value: 'URGENT', label: 'Аварийный' },
              ]}
            />
          </Form.Item>
          <Form.Item label="Контактный телефон" name="contactPhone" rules={[{ pattern: /^\+7\d{10}$/, message: 'Формат: +7XXXXXXXXXX' }]}>
            <Input placeholder="+79001234567" />
          </Form.Item>
          <Form.Item label="Желаемая дата/время визита" name="preferredVisitAt">
            <Input type="datetime-local" />
          </Form.Item>
          {canEditRequests ? (
            <Form.Item label="Назначить на сотрудника (ID, опционально)" name="assignedToUserId" rules={[userIdRule]}>
              <Input />
            </Form.Item>
          ) : null}
          <Form.Item label="Комментарий оператора" name="comment" rules={[{ max: 1000, message: 'До 1000 символов' }]}>
            <Input.TextArea rows={3} placeholder="Например: направлено в бригаду №2" />
          </Form.Item>
        </Form>
      </Modal>



      <Modal
        open={viewModalOpen}
        title={viewRequest ? `Заявка: ${viewRequest.title}` : 'Заявка'}
        width={760}
        footer={[
          <Button key="history" onClick={() => viewRequest && void openHistory(viewRequest)} disabled={!viewRequest}>
            История
          </Button>,
          canEditRequests ? (
            <Button key="edit" type="primary" onClick={() => viewRequest && openEditModal(viewRequest)} disabled={!viewRequest}>
              Редактировать
            </Button>
          ) : null,
        ]}
        onCancel={() => {
          setViewModalOpen(false);
          setViewRequest(null);
        }}
      >
        {viewRequest ? (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space size={8} wrap>
              <Tag color={statusColor(viewRequest.status)}>{statusLabel(viewRequest.status)}</Tag>
              <Tag color="purple">{categoryLabel(viewRequest.category)}</Tag>
              <Tag color="geekblue">{priorityLabel((viewRequest as any).priority)}</Tag>
            </Space>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Заголовок">{viewRequest.title}</Descriptions.Item>
              <Descriptions.Item label="Описание">{viewRequest.description}</Descriptions.Item>
              <Descriptions.Item label="Автор">{viewRequest.createdByUser?.email ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Создано">{new Date(viewRequest.createdAt).toLocaleString('ru-RU')}</Descriptions.Item>
              <Descriptions.Item label="Назначено на">{viewRequest.assignedToUserId ?? 'Не назначено'}</Descriptions.Item>
              <Descriptions.Item label="ID заявки">{viewRequest.id}</Descriptions.Item>
            </Descriptions>
          </Space>
        ) : null}
      </Modal>

      <Modal
        open={historyModalOpen}
        title={historyRequest ? `История заявки: ${historyRequest.title}` : 'История заявки'}
        footer={null}
        onCancel={() => {
          setHistoryModalOpen(false);
          setHistoryItems([]);
          setHistoryRequest(null);
        }}
      >
        <List
          loading={historyLoading}
          dataSource={historyItems}
          locale={{ emptyText: 'История изменений пока отсутствует' }}
          renderItem={(entry) => (
            <List.Item>
              <Space direction="vertical" size={0}>
                <Typography.Text strong>
                  {statusLabel(entry.oldStatus)} → {statusLabel(entry.newStatus)}
                </Typography.Text>
                <Typography.Text type="secondary">
                  {new Date(entry.changedAt).toLocaleString('ru-RU')} · {entry.changedByUser?.fullName || entry.changedByUser?.email || entry.changedByUserId}
                </Typography.Text>
                {entry.comment ? <Typography.Text>{entry.comment}</Typography.Text> : null}
              </Space>
            </List.Item>
          )}
        />
      </Modal>

      <Modal
        open={authorModalOpen}
        title="Карточка автора заявки"
        footer={null}
        onCancel={() => {
          setAuthorModalOpen(false);
          setAuthorRequest(null);
        }}
      >
        {authorRequest?.createdByUser?.subscriber ? (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="ФИО">{authorRequest.createdByUser.subscriber.fullName}</Descriptions.Item>
            <Descriptions.Item label="ID абонента">{authorRequest.createdByUser.subscriber.id}</Descriptions.Item>
            <Descriptions.Item label="Email">{authorRequest.createdByUser.email}</Descriptions.Item>
          </Descriptions>
        ) : (
          <Typography.Text type="secondary">Для автора нет связанной карточки абонента.</Typography.Text>
        )}
      </Modal>

    </>
  );
}
