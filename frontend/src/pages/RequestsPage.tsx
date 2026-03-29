import { Alert, Button, Descriptions, Form, Input, List, Modal, Pagination, Select, Space, Tag, Typography, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { extractApiErrorMessage } from '../api/error';
import { createRequest, getRequests, updateRequest } from '../api/requests';
import { getSubscriberById, getSubscribers } from '../api/subscribers';
import { readAuth } from '../app/auth-storage';
import type { ServiceRequest } from '../types/requests';
import type { Subscriber } from '../types/subscribers';
import { filterRequests, paginate, sortRequests, type RequestSort, type RequestStatusFilter } from '../utils/list-filters';
import { buildRequestsPresetQuery, hasActiveQuery, withUpdatedParam } from '../utils/list-query-state';

type CreateRequestForm = {
  subscriberId: string;
  accountId: string;
  title: string;
  description: string;
  category: 'ACCIDENT' | 'COMPLAINT' | 'QUESTION';
  assignedToUserId?: string;
};

type EditRequestForm = {
  title: string;
  description: string;
  category: 'ACCIDENT' | 'COMPLAINT' | 'QUESTION';
  status: 'NEW' | 'IN_PROGRESS' | 'DONE' | 'REJECTED';
  assignedToUserId?: string;
};

type AccountOption = {
  value: string;
  label: string;
};

const uuidRule = {
  pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  message: 'Введите корректный UUID',
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
  const [form] = Form.useForm<CreateRequestForm>();
  const [editForm] = Form.useForm<EditRequestForm>();
  const [messageApi, contextHolder] = message.useMessage();
  const [searchParams, setSearchParams] = useSearchParams();

  const auth = readAuth();
  const isAdmin = auth?.user.role === 'ADMIN';
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
    setAccountOptions([]);
    form.setFieldsValue({
      category: 'QUESTION',
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
        label: `${account.accountNumber} (${account.id.slice(0, 8)}...)`,
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
        assignedToUserId: values.assignedToUserId || undefined,
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
      assignedToUserId: request.assignedToUserId ?? undefined
    });
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
        assignedToUserId: values.assignedToUserId || null
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

  return (
    <>
      {contextHolder}

      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Заявки
        </Typography.Title>
        <Button type="primary" onClick={openCreateModal} size="middle">
          Создать заявку
        </Button>
      </Space>

      <Space style={{ marginBottom: 12 }} wrap align="start">
        <Input.Search
          allowClear
          placeholder="Поиск по заголовку, описанию, категории"
          value={search}
          onChange={(event) => updateParam('q', event.target.value)}
          style={{ width: 340 }}
          size="middle"
        />
        <Select
          value={statusFilter}
          onChange={(value) => updateParam('status', value)}
          style={{ width: 220 }}
          size="middle"
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
          size="middle"
          options={[
            { value: 'newest', label: 'Сначала новые' },
            { value: 'oldest', label: 'Сначала старые' },
            { value: 'categoryAsc', label: 'Категория: А→Я' },
            { value: 'categoryDesc', label: 'Категория: Я→А' },
          ]}
        />
      </Space>

      <Space.Compact style={{ marginBottom: 16 }} block>
        <Button size="middle" onClick={() => applyPreset('open')}>
          Пресет: новые
        </Button>
        <Button size="middle" onClick={() => applyPreset('inProgress')}>
          Пресет: в работе
        </Button>
        <Button size="middle" onClick={resetFilters}>
          Сбросить фильтры
        </Button>
      </Space.Compact>

      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}

      <List
        bordered
        loading={loading}
        dataSource={paginatedItems}
        renderItem={(item) => (
          <List.Item>
            <Space direction="vertical" size={2}>
              <Typography.Text strong>{item.title}</Typography.Text>
              <Typography.Text type="secondary">{new Date(item.createdAt).toLocaleString('ru-RU')}</Typography.Text>
              <Space size={8} wrap>
                <Tag color="purple">{categoryLabel(item.category)}</Tag>
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
              <Tag color={statusColor(item.status)}>{statusLabel(item.status)}</Tag>
              {canEditRequests ? (
                <Button size="middle" onClick={() => openEditModal(item)}>
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
          <Form.Item
            label="Абонент"
            name="subscriberId"
            rules={[{ required: true, message: 'Выберите абонента' }]}
          >
            <Select
              showSearch
              placeholder="Выберите абонента"
              optionFilterProp="label"
              options={subscribers.map((subscriber) => ({ value: subscriber.id, label: `${subscriber.fullName} (${subscriber.id.slice(0, 8)}...)` }))}
              onChange={(value) => void loadAccountsForSubscriber(value)}
            />
          </Form.Item>

          <Form.Item
            label="Лицевой счёт"
            name="accountId"
            rules={[{ required: true, message: 'Выберите лицевой счёт' }]}
          >
            <Select
              loading={loadingAccounts}
              placeholder={loadingAccounts ? 'Загружаем лицевые счета...' : 'Выберите лицевой счёт'}
              options={accountOptions}
              disabled={!form.getFieldValue('subscriberId')}
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

          {isAdmin ? (
            <Form.Item label="assignedToUserId (UUID, опционально)" name="assignedToUserId" rules={[uuidRule]}>
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
          {isAdmin ? (
            <Form.Item label="assignedToUserId (UUID, опционально)" name="assignedToUserId" rules={[uuidRule]}>
              <Input />
            </Form.Item>
          ) : null}
        </Form>
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
