import { Alert, Button, Form, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { extractApiErrorMessage } from '../api/error';
import { createSubscriber, getSubscribers } from '../api/subscribers';
import { readAuth } from '../app/auth-storage';
import type { Subscriber } from '../types/subscribers';
import { filterSubscribers, paginate, sortSubscribers, type SubscriberSort } from '../utils/list-filters';
import { buildSubscribersPresetQuery, hasActiveQuery, withUpdatedParam } from '../utils/list-query-state';

type CreateSubscriberForm = {
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
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<CreateSubscriberForm>();
  const [messageApi, contextHolder] = message.useMessage();
  const [searchParams, setSearchParams] = useSearchParams();

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
    const auth = readAuth();
    setModalOpen(true);
    form.setFieldsValue({ userId: auth?.user.id ?? undefined });
  }

  async function handleCreate(values: CreateSubscriberForm) {
    try {
      setSaving(true);
      setError(null);
      await createSubscriber({
        fullName: values.fullName,
        phone: values.phone,
        address: values.address,
        apartment: values.apartment || undefined,
        userId: values.userId || undefined,
      });
      setModalOpen(false);
      form.resetFields();
      messageApi.success('Абонент успешно создан');
      await loadSubscribers();
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Не удалось создать абонента. Проверьте введённые данные.'));
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
        <Button type="primary" onClick={openCreateModal}>
          Добавить абонента
        </Button>
      </Space>

      <Space style={{ marginBottom: 12 }} wrap>
        <Input.Search
          allowClear
          placeholder="Поиск по ФИО, адресу или телефону"
          value={search}
          onChange={(event) => updateParam('q', event.target.value)}
          style={{ width: 320 }}
        />
        <Select
          value={sort}
          onChange={(value) => updateParam('sort', value)}
          style={{ width: 240 }}
          options={[
            { value: 'newest', label: 'Сначала новые' },
            { value: 'oldest', label: 'Сначала старые' },
            { value: 'nameAsc', label: 'ФИО: А→Я' },
            { value: 'nameDesc', label: 'ФИО: Я→А' },
          ]}
        />
      </Space>

      <Space style={{ marginBottom: 16 }} wrap>
        <Button onClick={() => applyPreset('newest')}>Пресет: новые</Button>
        <Button onClick={() => applyPreset('nameAsc')}>Пресет: по алфавиту</Button>
        <Button onClick={resetFilters}>Сбросить фильтры</Button>
      </Space>

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
            render: () => <Tag color="green">ACTIVE</Tag>,
          },
        ]}
      />

      <Modal
        open={modalOpen}
        title="Новый абонент"
        okText="Сохранить"
        cancelText="Отмена"
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item label="ФИО" name="fullName" rules={[{ required: true, min: 5, message: 'Минимум 5 символов' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            label="Телефон (+380...)"
            name="phone"
            rules={[
              { required: true, message: 'Введите телефон' },
              { pattern: /^\+380\d{9}$/, message: 'Формат: +380XXXXXXXXX' },
            ]}
          >
            <Input placeholder="+380501112233" />
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
