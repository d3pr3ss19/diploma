import { Alert, Button, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { deactivateUser } from '../api/auth';
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
  userId?: string;
};

const uuidRule = {
  pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  message: 'Введите корректный UUID',
};

const PAGE_SIZE = 10;
const SUBSCRIBERS_PRESET_KEY = 'subscribers-last-preset';

export function SubscribersPage() {
  const [items, setItems] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubscriber, setEditingSubscriber] = useState<Subscriber | null>(null);
  const [saving, setSaving] = useState(false);
  const [deactivatingUserId, setDeactivatingUserId] = useState<string | null>(null);
  const [form] = Form.useForm<SubscriberForm>();
  const [messageApi, contextHolder] = message.useMessage();
  const [searchParams, setSearchParams] = useSearchParams();

  const auth = readAuth();
  const isAdmin = auth?.user.role === 'ADMIN';

  const search = searchParams.get('q') ?? '';
  const sort = (searchParams.get('sort') as SubscriberSort | null) ?? 'newest';
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

  const filteredItems = useMemo(() => sortSubscribers(filterSubscribers(items, search), sort), [items, search, sort]);

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
    const authData = readAuth();
    setEditingSubscriber(null);
    setModalOpen(true);
    form.setFieldsValue({
      fullName: '',
      phone: '',
      address: '',
      apartment: undefined,
      userId: authData?.user.id ?? undefined,
    });
  }

  function openEditModal(subscriber: Subscriber) {
    setEditingSubscriber(subscriber);
    setModalOpen(true);
    form.setFieldsValue({
      fullName: subscriber.fullName,
      phone: subscriber.phone ?? '',
      address: subscriber.address,
      apartment: subscriber.apartment ?? undefined,
      userId: subscriber.userId ?? undefined,
    });
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

  async function handleSubmit(values: SubscriberForm) {
    try {
      setSaving(true);
      setError(null);

      if (editingSubscriber) {
        await updateSubscriber(editingSubscriber.id, {
          fullName: values.fullName,
          phone: values.phone,
          address: values.address,
          apartment: values.apartment || undefined,
          userId: values.userId || undefined,
        });
        messageApi.success('Карточка абонента обновлена');
      } else {
        await createSubscriber({
          fullName: values.fullName,
          phone: values.phone,
          address: values.address,
          apartment: values.apartment || undefined,
          userId: values.userId || undefined,
        });
        messageApi.success('Абонент успешно создан');
      }

      setModalOpen(false);
      form.resetFields();
      setEditingSubscriber(null);
      await loadSubscribers();
    } catch (err) {
      setError(
        extractApiErrorMessage(
          err,
          editingSubscriber
            ? 'Не удалось обновить абонента. Проверьте введённые данные.'
            : 'Не удалось создать абонента. Проверьте введённые данные.',
        ),
      );
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
          style={{ width: 240 }}
          size="middle"
          options={[
            { value: 'newest', label: 'Сначала новые' },
            { value: 'oldest', label: 'Сначала старые' },
            { value: 'nameAsc', label: 'ФИО: А→Я' },
            { value: 'nameDesc', label: 'ФИО: Я→А' },
          ]}
        />
      </Space>

      <Space.Compact style={{ marginBottom: 16 }} block>
        <Button size="middle" onClick={() => applyPreset('newest')}>
          Пресет: новые
        </Button>
        <Button size="middle" onClick={() => applyPreset('nameAsc')}>
          Пресет: по алфавиту
        </Button>
        <Button size="middle" onClick={resetFilters}>
          Сбросить фильтры
        </Button>
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
          {
            title: 'Статус',
            key: 'status',
            render: (_: unknown, subscriber: Subscriber) => {
              const isActual = subscriber.user?.isActual ?? true;
              return <Tag color={isActual ? 'green' : 'red'}>{isActual ? 'ACTIVE' : 'INACTIVE'}</Tag>;
            },
          },
          ...(isAdmin
            ? [
                {
                  title: 'Действия',
                  key: 'actions',
                  render: (_: unknown, subscriber: Subscriber) => (
                    <Space wrap>
                      <Button size="small" onClick={() => openEditModal(subscriber)}>
                        Редактировать
                      </Button>
                      {subscriber.userId ? (
                        <Popconfirm
                          title="Деактивировать пользователя?"
                          description="Пользователь потеряет доступ в систему до повторной активации."
                          okText="Да"
                          cancelText="Нет"
                          onConfirm={() => void handleDeactivateUser(subscriber.userId as string)}
                        >
                          <Button
                            size="small"
                            danger
                            loading={deactivatingUserId === subscriber.userId}
                            disabled={subscriber.user?.isActual === false}
                          >
                            Деактивировать
                          </Button>
                        </Popconfirm>
                      ) : null}
                    </Space>
                  ),
                },
              ]
            : []),
        ]}
      />

      <Modal
        open={modalOpen}
        title={editingSubscriber ? 'Редактирование абонента' : 'Новый абонент'}
        okText={editingSubscriber ? 'Сохранить' : 'Создать'}
        cancelText="Отмена"
        onCancel={() => {
          setModalOpen(false);
          setEditingSubscriber(null);
        }}
        onOk={() => form.submit()}
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
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
          <Form.Item label="userId (UUID, опционально)" name="userId" rules={[uuidRule]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
