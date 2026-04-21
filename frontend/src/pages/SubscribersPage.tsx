import { Alert, Button, Descriptions, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { activateUser, deactivateUser, deleteUser, resetUserPassword, updateUserRole } from '../api/auth';
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
  if (isArchived) return <Tag color="default">В АРХИВЕ</Tag>;
  const isActual = subscriber.user?.isActual ?? true;
  return <Tag color={isActual ? 'green' : 'red'}>{isActual ? 'АКТИВЕН' : 'НЕАКТИВЕН'}</Tag>;
}

function roleLabel(subscriber: Subscriber): string {
  const code = subscriber.user?.role?.code;
  if (code === 'ADMIN') return 'Администратор';
  if (code === 'OPERATOR') return 'Оператор';
  if (code === 'SUBSCRIBER') return 'Абонент';
  return '—';
}

export function SubscribersPage() {
  const [items, setItems] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileEditing, setProfileEditing] = useState(false);
  const [selectedSubscriber, setSelectedSubscriber] = useState<Subscriber | null>(null);

  const [saving, setSaving] = useState(false);
  const [deactivatingUserId, setDeactivatingUserId] = useState<number | null>(null);
  const [activatingUserId, setActivatingUserId] = useState<number | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [changingRoleUserId, setChangingRoleUserId] = useState<number | null>(null);

  const [createForm] = Form.useForm<SubscriberForm>();
  const [profileForm] = Form.useForm<SubscriberForm>();
  const [messageApi, contextHolder] = message.useMessage();
  const [searchParams, setSearchParams] = useSearchParams();

  const auth = readAuth();
  const isAdmin = auth?.user.role === 'ADMIN';
  const canOpenProfiles = auth?.user.role === 'ADMIN' || auth?.user.role === 'OPERATOR';
  const canManageSubscribers = isAdmin;

  const search = searchParams.get('q') ?? '';
  const sort = (searchParams.get('sort') as SubscriberSort | null) ?? 'newest';
  const statusFilter = (searchParams.get('status') as 'ALL' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | null) ?? 'ALL';
  const roleFilter = (searchParams.get('role') as 'ALL' | 'ADMIN' | 'OPERATOR' | 'SUBSCRIBER' | null) ?? 'ALL';
  const currentPage = Number(searchParams.get('page') ?? '1') || 1;

  async function loadSubscribers() {
    try {
      setLoading(true);
      setError(null);
      const data = await getSubscribers();
      setItems(data);
      setSelectedSubscriber((prev) => (prev ? data.find((item) => item.id === prev.id) ?? prev : prev));
      return data;
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Не удалось загрузить абонентов.'));
      return [] as Subscriber[];
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
    const byRole = byStatus.filter((subscriber) => {
      if (roleFilter === 'ALL') return true;
      return subscriber.user?.role?.code === roleFilter;
    });
    return sortSubscribers(byRole, sort);
  }, [items, search, sort, statusFilter, roleFilter]);

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
    setProfileEditing(false);
    profileForm.setFieldsValue({
      fullName: subscriber.fullName,
      phone: subscriber.phone ?? '',
      address: subscriber.address,
      apartment: subscriber.apartment ?? undefined,
    });
    setProfileOpen(true);
  }

  async function handleDeactivateUser(userId: number) {
    try {
      setDeactivatingUserId(userId);
      await deactivateUser(userId);
      messageApi.success('Пользователь деактивирован');
      await loadSubscribers();
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Не удалось деактивировать пользователя.'));
    } finally {
      setDeactivatingUserId(null);
    }
  }

  async function handleActivateUser(userId: number) {
    try {
      setActivatingUserId(userId);
      await activateUser(userId);
      messageApi.success('Пользователь активирован');
      await loadSubscribers();
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Не удалось активировать пользователя.'));
    } finally {
      setActivatingUserId(null);
    }
  }

  async function handleArchiveUser(userId: number) {
    try {
      setDeletingUserId(userId);
      await deleteUser(userId);
      messageApi.success('Пользователь архивирован');
      await loadSubscribers();
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Не удалось архивировать пользователя.'));
    } finally {
      setDeletingUserId(null);
    }
  }


  async function handleRoleChange(userId: number, role: 'ADMIN' | 'OPERATOR' | 'SUBSCRIBER') {
    try {
      setChangingRoleUserId(userId);
      await updateUserRole(userId, role);
      messageApi.success('Роль пользователя обновлена');
      await loadSubscribers();
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Не удалось обновить роль пользователя.'));
    } finally {
      setChangingRoleUserId(null);
    }
  }

  async function handleResetPassword(userId: number) {
    try {
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
      setError(extractApiErrorMessage(err, 'Не удалось создать абонента.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleProfileSave(values: SubscriberForm) {
    if (!selectedSubscriber) return;

    try {
      setSaving(true);
      await updateSubscriber(selectedSubscriber.id, {
        fullName: values.fullName,
        phone: values.phone,
        address: values.address,
        apartment: values.apartment || undefined,
      });
      messageApi.success('Карточка абонента обновлена');
      setProfileEditing(false);
      await loadSubscribers();
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
        <Typography.Title level={3} style={{ margin: 0 }}>Абоненты</Typography.Title>
        {canManageSubscribers ? <Button type="primary" size="large" onClick={openCreateModal}>Добавить абонента</Button> : null}
      </Space>

      <Space style={{ marginBottom: 12 }} wrap align="start">
        <Input.Search
          allowClear
          placeholder="Поиск по ФИО, адресу или телефону"
          value={search}
          onChange={(event) => updateParam('q', event.target.value)}
          style={{ width: 320 }}
          size="large"
        />
        <Select
          value={sort}
          onChange={(value) => updateParam('sort', value)}
          style={{ width: 220 }}
          size="large"
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
          size="large"
          options={[
            { value: 'ALL', label: 'Все статусы' },
            { value: 'ACTIVE', label: 'Активные' },
            { value: 'INACTIVE', label: 'Неактивные' },
            { value: 'ARCHIVED', label: 'Архивные' },
          ]}
        />
        <Select
          value={roleFilter}
          onChange={(value) => updateParam('role', value)}
          style={{ width: 220 }}
          size="large"
          options={[
            { value: 'ALL', label: 'Все роли' },
            { value: 'ADMIN', label: 'Администратор' },
            { value: 'OPERATOR', label: 'Оператор' },
            { value: 'SUBSCRIBER', label: 'Абонент' },
          ]}
        />
      </Space>

      <Space.Compact style={{ marginBottom: 16 }} block>
        <Button size="large" onClick={() => applyPreset('newest')}>Пресет: новые</Button>
        <Button size="large" onClick={() => applyPreset('nameAsc')}>Пресет: по алфавиту</Button>
        <Button size="large" onClick={resetFilters}>Сбросить фильтры</Button>
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
          { title: 'Роль', key: 'role', render: (_: unknown, subscriber: Subscriber) => roleLabel(subscriber) },
          {
            title: 'Заявок создано',
            key: 'requestsCount',
            render: (_: unknown, subscriber: Subscriber) =>
              (subscriber.accounts ?? []).reduce((sum, account) => sum + (account._count?.requests ?? 0), 0),
          },
          { title: 'Статус', key: 'status', render: (_: unknown, subscriber: Subscriber) => renderUserStatus(subscriber) },
          ...(canOpenProfiles ? [{
            title: 'Действия',
            key: 'actions',
            render: (_: unknown, subscriber: Subscriber) => (
              <Button size="large" onClick={() => openSubscriberProfile(subscriber)}>Открыть карточку</Button>
            ),
          }] : []),
        ]}
      />

      <Modal
        open={profileOpen}
        width={760}
        title={selectedSubscriber ? `Карточка: ${selectedSubscriber.fullName}` : 'Карточка абонента'}
        footer={null}
        onCancel={() => {
          setProfileOpen(false);
          setSelectedSubscriber(null);
          setProfileEditing(false);
        }}
      >
        {selectedSubscriber ? (
          <Form form={profileForm} layout="vertical" onFinish={handleProfileSave}>
            <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="ФИО">
                {profileEditing ? (
                  <Form.Item name="fullName" noStyle rules={[{ required: true, min: 5, message: 'Минимум 5 символов' }]}>
                    <Input />
                  </Form.Item>
                ) : selectedSubscriber.fullName}
              </Descriptions.Item>
              <Descriptions.Item label="Телефон">
                {profileEditing ? (
                  <Form.Item name="phone" noStyle rules={[{ required: true, pattern: /^\+7\d{10}$/, message: 'Формат: +7XXXXXXXXXX' }]}>
                    <Input />
                  </Form.Item>
                ) : (selectedSubscriber.phone ?? '—')}
              </Descriptions.Item>
              <Descriptions.Item label="Адрес">
                {profileEditing ? (
                  <Form.Item name="address" noStyle rules={[{ required: true, min: 5, message: 'Минимум 5 символов' }]}>
                    <Input />
                  </Form.Item>
                ) : selectedSubscriber.address}
              </Descriptions.Item>
              <Descriptions.Item label="Квартира">
                {profileEditing ? (
                  <Form.Item name="apartment" noStyle>
                    <Input />
                  </Form.Item>
                ) : (selectedSubscriber.apartment ?? '—')}
              </Descriptions.Item>
              <Descriptions.Item label="Статус">{renderUserStatus(selectedSubscriber)}</Descriptions.Item>
              <Descriptions.Item label="Роль">
                {isAdmin && selectedSubscriber.user?.id ? (
                  <Select
                    style={{ width: 240 }}
                    value={selectedSubscriber.user?.role?.code ?? 'SUBSCRIBER'}
                    loading={changingRoleUserId === selectedSubscriber.user?.id}
                    onChange={(value) => void handleRoleChange(selectedSubscriber.user?.id as number, value)}
                    options={[
                      { value: 'SUBSCRIBER', label: 'Абонент' },
                      { value: 'OPERATOR', label: 'Оператор' },
                      { value: 'ADMIN', label: 'Администратор' },
                    ]}
                  />
                ) : roleLabel(selectedSubscriber)}
              </Descriptions.Item>
            </Descriptions>

            <Space wrap>
              {canManageSubscribers && !profileEditing ? <Button size="large" onClick={() => setProfileEditing(true)}>Изменить</Button> : null}
              {canManageSubscribers && profileEditing ? <Button size="large" onClick={() => setProfileEditing(false)}>Отменить</Button> : null}
              {canManageSubscribers && profileEditing ? <Button size="large" type="primary" htmlType="submit" loading={saving}>Сохранить</Button> : null}

              {canManageSubscribers && selectedSubscriber.user?.id && (selectedSubscriber.user?.isActual ?? true) ? (
                <Button size="large" danger loading={deactivatingUserId === selectedSubscriber.user?.id} onClick={() => void handleDeactivateUser(selectedSubscriber.user?.id as number)}>
                  Деактивировать
                </Button>
              ) : null}
              {canManageSubscribers && selectedSubscriber.user?.id && !(selectedSubscriber.user?.isActual ?? true) ? (
                <Button size="large" type="primary" ghost loading={activatingUserId === selectedSubscriber.user?.id} onClick={() => void handleActivateUser(selectedSubscriber.user?.id as number)}>
                  Активировать
                </Button>
              ) : null}
              {canManageSubscribers && selectedSubscriber.user?.id ? <Button size="large" onClick={() => void handleResetPassword(selectedSubscriber.user?.id as number)}>Сбросить пароль</Button> : null}
              {canManageSubscribers && selectedSubscriber.user?.id ? (
                <Popconfirm
                  title="Архивировать пользователя?"
                  description="Пользователь будет скрыт и отключён, при необходимости его можно снова активировать."
                  okText="Архивировать"
                  cancelText="Отмена"
                  onConfirm={() => void handleArchiveUser(selectedSubscriber.user?.id as number)}
                >
                  <Button size="large" danger loading={deletingUserId === selectedSubscriber.user?.id}>Архивировать</Button>
                </Popconfirm>
              ) : null}
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
