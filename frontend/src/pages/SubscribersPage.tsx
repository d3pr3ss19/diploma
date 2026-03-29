import { ArrowLeftOutlined } from '@ant-design/icons';
import { Alert, Button, Descriptions, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { activateUser, deactivateUser, deleteUser, resetUserPassword } from '../api/auth';
import { extractApiErrorMessage } from '../api/error';
import { createSubscriber, getSubscribers, updateSubscriber } from '../api/subscribers';
import { readAuth } from '../app/auth-storage';
import type { Subscriber } from '../types/subscribers';
import { filterSubscribers, paginate, sortSubscribers, type SubscriberSort } from '../utils/list-filters';
import { buildSubscribersPresetQuery, hasActiveQuery, withUpdatedParam } from '../utils/list-query-state';

type SubscriberForm = {
  fullName: string;
  phone: string;
  address: string;
  apartment?: string;
};

const PAGE_SIZE = 10;
const SUBSCRIBERS_PRESET_KEY = 'subscribers-last-preset';

function renderUserStatus(subscriber: Subscriber) {
  const isArchived = Boolean(subscriber.user?.deletedAt);
  if (isArchived) {
    return <Tag color="default">В АРХИВЕ</Tag>;
  }

  const isActual = subscriber.user?.isActual ?? true;
  return <Tag color={isActual ? 'green' : 'red'}>{isActual ? 'АКТИВЕН' : 'НЕАКТИВЕН'}</Tag>;
}

export function SubscribersPage() {
  const [items, setItems] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileMode, setProfileMode] = useState<'view' | 'edit'>('view');
  const [selectedSubscriber, setSelectedSubscriber] = useState<Subscriber | null>(null);

  const [saving, setSaving] = useState(false);
  const [deactivatingUserId, setDeactivatingUserId] = useState<string | null>(null);
  const [activatingUserId, setActivatingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const [createForm] = Form.useForm<SubscriberForm>();
  const [profileForm] = Form.useForm<SubscriberForm>();
  const [messageApi, contextHolder] = message.useMessage();
  const [searchParams, setSearchParams] = useSearchParams();

  const auth = readAuth();
  const isAdmin = auth?.user.role === 'ADMIN';

  const search = searchParams.get('q') ?? '';
  const sort = (searchParams.get('sort') as SubscriberSort | null) ?? 'newest';
  const statusFilter = (searchParams.get('status') as 'ALL' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | null) ?? 'ALL';
  const currentPage = Number(searchParams.get('page') ?? '1') || 1;

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

  useEffect(() => {
    void loadSubscribers();
  }, []);

  useEffect(() => {
    if (hasActiveQuery(searchParams)) {
      return;
    }

    const savedPreset = localStorage.getItem(SUBSCRIBERS_PRESET_KEY) as 'newest' | 'nameAsc' | null;
    if (savedPreset) {
      setSearchParams(buildSubscribersPresetQuery(savedPreset));
    }
  }, [searchParams, setSearchParams]);

  const filteredItems = useMemo(() => {
    const base = filterSubscribers(items, search);
    const byStatus = base.filter((subscriber) => {
      if (statusFilter === 'ALL') return true;

      const isActual = subscriber.user?.isActual ?? true;
      const isArchived = Boolean(subscriber.user?.deletedAt);

      if (statusFilter === 'ARCHIVED') return isArchived;
      if (statusFilter === 'ACTIVE') return isActual && !isArchived;
      return !isActual && !isArchived;
    });

    return sortSubscribers(byStatus, sort);
  }, [items, search, sort, statusFilter]);

  const paginatedItems = useMemo(() => paginate(filteredItems, currentPage, PAGE_SIZE), [filteredItems, currentPage]);

  function updateParam(key: string, value: string) {
    setSearchParams(withUpdatedParam(searchParams, key, value));
  }

  function applyPreset(preset: 'newest' | 'nameAsc') {
    setSearchParams(buildSubscribersPresetQuery(preset));
    localStorage.setItem(SUBSCRIBERS_PRESET_KEY, preset);
  }

  function resetFilters() {
    setSearchParams(new URLSearchParams());
    localStorage.removeItem(SUBSCRIBERS_PRESET_KEY);
  }

  function openCreateModal() {
    setCreateModalOpen(true);
    createForm.setFieldsValue({ fullName: '', phone: '', address: '', apartment: undefined });
  }

  function openSubscriberProfile(subscriber: Subscriber) {
    setSelectedSubscriber(subscriber);
    setProfileMode('view');
    profileForm.setFieldsValue({
      fullName: subscriber.fullName,
      phone: subscriber.phone ?? '',
      address: subscriber.address,
      apartment: subscriber.apartment ?? undefined,
    });
    setProfileOpen(true);
  }

  async function handleDeactivateUser(userId: string) {
    try {
      setDeactivatingUserId(userId);
      setError(null);
      await deactivateUser(userId);
      messageApi.success('Пользователь деактивирован');
      await loadSubscribers();
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Не удалось деактивировать пользователя.'));
    } finally {
      setDeactivatingUserId(null);
    }
  }

  async function handleActivateUser(userId: string) {
    try {
      setActivatingUserId(userId);
      setError(null);
      await activateUser(userId);
      messageApi.success('Пользователь активирован');
      await loadSubscribers();
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Не удалось активировать пользователя.'));
    } finally {
      setActivatingUserId(null);
    }
  }

  async function handleArchiveUser(userId: string) {
    try {
      setDeletingUserId(userId);
      setError(null);
      await deleteUser(userId);
      messageApi.success('Пользователь архивирован');
      await loadSubscribers();
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Не удалось архивировать пользователя.'));
    } finally {
      setDeletingUserId(null);
    }
  }

  async function handleResetPassword(userId: string) {
    try {
      setError(null);
      const result = await resetUserPassword(userId);
      Modal.info({
        title: 'Новый пароль пользователя',
        content: <Typography.Text copyable>Пароль: {result.password}</Typography.Text>
      });
      messageApi.success('Пароль сброшен');
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Не удалось сбросить пароль пользователя.'));
    }
  }

  async function handleCreate(values: SubscriberForm) {
    try {
      setSaving(true);
      setError(null);

      const created = await createSubscriber({
        fullName: values.fullName,
        phone: values.phone,
        address: values.address,
        apartment: values.apartment || undefined,
      });

      messageApi.success('Абонент успешно создан');

      if (created.generatedCredentials) {
        Modal.info({
          title: 'Данные для входа абонента',
          content: (
            <Space direction="vertical" size={4}>
              <Typography.Text>Логин: {created.generatedCredentials.login}</Typography.Text>
              <Typography.Text copyable>Пароль: {created.generatedCredentials.password}</Typography.Text>
            </Space>
          )
        });
      }

      setCreateModalOpen(false);
      createForm.resetFields();
      await loadSubscribers();
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Не удалось создать абонента. Проверьте введённые данные.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleProfileSave(values: SubscriberForm) {
    if (!selectedSubscriber) return;

    try {
      setSaving(true);
      setError(null);
      await updateSubscriber(selectedSubscriber.id, {
        fullName: values.fullName,
        phone: values.phone,
        address: values.address,
        apartment: values.apartment || undefined,
      });
      messageApi.success('Карточка абонента обновлена');
      setProfileMode('view');
      await loadSubscribers();
      const refreshed = items.find((item) => item.id === selectedSubscriber.id);
      if (refreshed) {
        setSelectedSubscriber(refreshed);
      }
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Не удалось обновить абонента.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {contextHolder}

      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Абоненты
        </Typography.Title>
        <Button type="primary" onClick={openCreateModal} size="middle">
          Добавить абонента
        </Button>
      </Space>

      <Space style={{ marginBottom: 12 }} wrap align="start">
        <Input.Search
          allowClear
          placeholder="Поиск по ФИО, адресу или телефону"
          value={search}
          onChange={(event) => updateParam('q', event.target.value)}
          style={{ width: 320 }}
          size="middle"
        />
        <Select
          value={sort}
          onChange={(value) => updateParam('sort', value)}
          style={{ width: 220 }}
          size="middle"
          options={[
            { value: 'newest', label: 'Сначала новые' },
            { value: 'oldest', label: 'Сначала старые' },
            { value: 'nameAsc', label: 'ФИО: А→Я' },
            { value: 'nameDesc', label: 'ФИО: Я→А' },
          ]}
        />
        <Select
          value={statusFilter}
          onChange={(value) => updateParam('status', value)}
          style={{ width: 200 }}
          size="middle"
          options={[
            { value: 'ALL', label: 'Все статусы' },
            { value: 'ACTIVE', label: 'Активные' },
            { value: 'INACTIVE', label: 'Неактивные' },
            { value: 'ARCHIVED', label: 'Архивные' },
          ]}
        />
      </Space>

      <Space.Compact style={{ marginBottom: 16 }} block>
        <Button size="middle" onClick={() => applyPreset('newest')}>Пресет: новые</Button>
        <Button size="middle" onClick={() => applyPreset('nameAsc')}>Пресет: по алфавиту</Button>
        <Button size="middle" onClick={resetFilters}>Сбросить фильтры</Button>
      </Space.Compact>

      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}

      <Table
        rowKey="id"
        loading={loading}
        dataSource={paginatedItems}
        pagination={{
          current: currentPage,
          pageSize: PAGE_SIZE,
          total: filteredItems.length,
          showSizeChanger: false,
          onChange: (page) => updateParam('page', String(page)),
        }}
        columns={[
          { title: 'ФИО', dataIndex: 'fullName', key: 'fullName' },
          { title: 'Телефон', dataIndex: 'phone', key: 'phone', render: (value: string | null) => value ?? '—' },
          { title: 'Адрес', dataIndex: 'address', key: 'address' },
          { title: 'Статус', key: 'status', render: (_: unknown, subscriber: Subscriber) => renderUserStatus(subscriber) },
          ...(isAdmin
            ? [
                {
                  title: 'Действия',
                  key: 'actions',
                  render: (_: unknown, subscriber: Subscriber) => (
                    <Button size="small" onClick={() => openSubscriberProfile(subscriber)}>
                      Открыть карточку
                    </Button>
                  ),
                },
              ]
            : []),
        ]}
      />

      <Modal
        open={profileOpen}
        width={760}
        title={profileMode === 'edit' ? (
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => setProfileMode('view')}>
              Назад к карточке
            </Button>
            <Typography.Text strong>Редактирование абонента</Typography.Text>
          </Space>
        ) : (
          selectedSubscriber ? `Карточка: ${selectedSubscriber.fullName}` : 'Карточка абонента'
        )}
        footer={null}
        onCancel={() => {
          setProfileOpen(false);
          setSelectedSubscriber(null);
          setProfileMode('view');
        }}
      >
        {selectedSubscriber && profileMode === 'view' ? (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Телефон">{selectedSubscriber.phone ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Адрес">{selectedSubscriber.address}</Descriptions.Item>
              <Descriptions.Item label="Статус">{renderUserStatus(selectedSubscriber)}</Descriptions.Item>
            </Descriptions>

            <Space wrap>
              <Button onClick={() => setProfileMode('edit')}>Изменить</Button>
              {selectedSubscriber.userId && (selectedSubscriber.user?.isActual ?? true) ? (
                <Button danger loading={deactivatingUserId === selectedSubscriber.userId} onClick={() => void handleDeactivateUser(selectedSubscriber.userId as string)}>
                  Деактивировать
                </Button>
              ) : null}
              {selectedSubscriber.userId && !(selectedSubscriber.user?.isActual ?? true) ? (
                <Button type="primary" ghost loading={activatingUserId === selectedSubscriber.userId} onClick={() => void handleActivateUser(selectedSubscriber.userId as string)}>
                  Активировать
                </Button>
              ) : null}
              {selectedSubscriber.userId ? (
                <Button onClick={() => void handleResetPassword(selectedSubscriber.userId as string)}>Сбросить пароль</Button>
              ) : null}
              {selectedSubscriber.userId ? (
                <Popconfirm
                  title="Архивировать пользователя?"
                  description="Пользователь будет скрыт и отключён, при необходимости его можно снова активировать."
                  okText="Архивировать"
                  cancelText="Отмена"
                  onConfirm={() => void handleArchiveUser(selectedSubscriber.userId as string)}
                >
                  <Button danger loading={deletingUserId === selectedSubscriber.userId}>Архивировать</Button>
                </Popconfirm>
              ) : null}
            </Space>
          </Space>
        ) : null}

        {selectedSubscriber && profileMode === 'edit' ? (
          <Form form={profileForm} layout="vertical" onFinish={handleProfileSave}>
            <Form.Item label="ФИО" name="fullName" rules={[{ required: true, min: 5, message: 'Минимум 5 символов' }]}>
              <Input />
            </Form.Item>
            <Form.Item
              label="Телефон (+7...)"
              name="phone"
              rules={[
                { required: true, message: 'Введите телефон' },
                { pattern: /^\+7\d{10}$/, message: 'Формат: +7XXXXXXXXXX' },
              ]}
            >
              <Input placeholder="+79001234567" />
            </Form.Item>
            <Form.Item label="Адрес" name="address" rules={[{ required: true, min: 5, message: 'Минимум 5 символов' }]}>
              <Input />
            </Form.Item>
            <Form.Item label="Квартира" name="apartment" rules={[{ max: 20, message: 'До 20 символов' }]}>
              <Input />
            </Form.Item>
            <Space>
              <Button onClick={() => setProfileMode('view')}>Назад</Button>
              <Button type="primary" htmlType="submit" loading={saving}>Сохранить</Button>
            </Space>
          </Form>
        ) : null}
      </Modal>

      <Modal
        open={createModalOpen}
        title="Новый абонент"
        okText="Создать"
        cancelText="Отмена"
        onCancel={() => setCreateModalOpen(false)}
        onOk={() => createForm.submit()}
        confirmLoading={saving}
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Form.Item label="ФИО" name="fullName" rules={[{ required: true, min: 5, message: 'Минимум 5 символов' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            label="Телефон (+7...)"
            name="phone"
            rules={[
              { required: true, message: 'Введите телефон' },
              { pattern: /^\+7\d{10}$/, message: 'Формат: +7XXXXXXXXXX' },
            ]}
          >
            <Input placeholder="+79001234567" />
          </Form.Item>
          <Form.Item label="Адрес" name="address" rules={[{ required: true, min: 5, message: 'Минимум 5 символов' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Квартира" name="apartment" rules={[{ max: 20, message: 'До 20 символов' }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
