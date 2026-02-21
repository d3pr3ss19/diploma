import { Alert, Button, Form, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { extractApiErrorMessage } from '../api/error';
import { createSubscriber, getSubscribers } from '../api/subscribers';
import { readAuth } from '../app/auth-storage';
import type { Subscriber } from '../types/subscribers';

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
  const sort = (searchParams.get('sort') as 'newest' | 'oldest' | 'nameAsc' | 'nameDesc' | null) ?? 'newest';
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

  const filteredItems = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    const filtered = items.filter((item) => {
      if (!normalized) {
        return true;
      }

      return [item.fullName, item.address, item.phone ?? ''].join(' ').toLowerCase().includes(normalized);
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return Date.parse(a.createdAt) - Date.parse(b.createdAt);
        case 'nameAsc':
          return a.fullName.localeCompare(b.fullName, 'ru');
        case 'nameDesc':
          return b.fullName.localeCompare(a.fullName, 'ru');
        case 'newest':
        default:
          return Date.parse(b.createdAt) - Date.parse(a.createdAt);
      }
    });

    return sorted;
  }, [items, search, sort]);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }

    if (key !== 'page') {
      next.set('page', '1');
    }

    setSearchParams(next);
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

      <Space style={{ marginBottom: 16 }} wrap>
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

      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}

      <Table
        rowKey="id"
        loading={loading}
        dataSource={filteredItems}
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
