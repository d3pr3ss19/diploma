import { Alert, Button, Form, Input, List, Modal, Pagination, Select, Space, Tag, Typography, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { extractApiErrorMessage } from '../api/error';
import { createRequest, getRequests } from '../api/requests';
import { readAuth } from '../app/auth-storage';
import type { ServiceRequest } from '../types/requests';

type CreateRequestForm = {
  accountId: string;
  title: string;
  description: string;
  category: 'ACCIDENT' | 'COMPLAINT' | 'QUESTION';
  createdByUserId: string;
  assignedToUserId?: string;
};

const uuidRule = {
  pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  message: 'Введите корректный UUID',
};

const PAGE_SIZE = 10;
const REQUESTS_PRESET_KEY = 'requests-last-preset';

export function RequestsPage() {
  const [items, setItems] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<CreateRequestForm>();
  const [messageApi, contextHolder] = message.useMessage();
  const [searchParams, setSearchParams] = useSearchParams();

  const statusFilter =
    (searchParams.get('status') as 'ALL' | 'NEW' | 'IN_PROGRESS' | 'DONE' | 'REJECTED' | null) ?? 'ALL';
  const search = searchParams.get('q') ?? '';
  const sort = (searchParams.get('sort') as 'newest' | 'oldest' | null) ?? 'newest';
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

  useEffect(() => {
    void loadRequests();
  }, []);

  useEffect(() => {
    if (searchParams.toString()) {
      return;
    }

    const savedPreset = localStorage.getItem(REQUESTS_PRESET_KEY) as 'open' | 'inProgress' | null;
    if (!savedPreset) {
      return;
    }

    const next = new URLSearchParams();
    next.set('sort', 'newest');
    next.set('page', '1');

    if (savedPreset === 'open') {
      next.set('status', 'NEW');
    }

    if (savedPreset === 'inProgress') {
      next.set('status', 'IN_PROGRESS');
    }

    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  const filteredItems = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    const filtered = items.filter((item) => {
      const matchStatus = statusFilter === 'ALL' ? true : item.status === statusFilter;
      const matchText = normalized
        ? [item.title, item.description, item.category, item.status].join(' ').toLowerCase().includes(normalized)
        : true;
      return matchStatus && matchText;
    });

    const sorted = [...filtered];
    sorted.sort((a, b) =>
      sort === 'oldest' ? Date.parse(a.createdAt) - Date.parse(b.createdAt) : Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );

    return sorted;
  }, [items, search, sort, statusFilter]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredItems]);

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

  function applyPreset(preset: 'open' | 'inProgress') {
    const next = new URLSearchParams();
    next.set('sort', 'newest');
    next.set('page', '1');

    if (preset === 'open') {
      next.set('status', 'NEW');
    }

    if (preset === 'inProgress') {
      next.set('status', 'IN_PROGRESS');
    }

    setSearchParams(next);
    localStorage.setItem(REQUESTS_PRESET_KEY, preset);
  }

  function resetFilters() {
    setSearchParams(new URLSearchParams());
    localStorage.removeItem(REQUESTS_PRESET_KEY);
  }

  function openCreateModal() {
    const auth = readAuth();
    setModalOpen(true);
    form.setFieldsValue({
      createdByUserId: auth?.user.id ?? '',
      category: 'QUESTION',
    });
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
        createdByUserId: values.createdByUserId,
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

  return (
    <>
      {contextHolder}

      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Заявки
        </Typography.Title>
        <Button type="primary" onClick={openCreateModal}>
          Создать заявку
        </Button>
      </Space>

      <Space style={{ marginBottom: 12 }} wrap>
        <Input.Search
          allowClear
          placeholder="Поиск по заголовку, описанию, категории"
          value={search}
          onChange={(event) => updateParam('q', event.target.value)}
          style={{ width: 340 }}
        />
        <Select
          value={statusFilter}
          onChange={(value) => updateParam('status', value)}
          style={{ width: 220 }}
          options={[
            { value: 'ALL', label: 'Все статусы' },
            { value: 'NEW', label: 'NEW' },
            { value: 'IN_PROGRESS', label: 'IN_PROGRESS' },
            { value: 'DONE', label: 'DONE' },
            { value: 'REJECTED', label: 'REJECTED' },
          ]}
        />
        <Select
          value={sort}
          onChange={(value) => updateParam('sort', value)}
          style={{ width: 200 }}
          options={[
            { value: 'newest', label: 'Сначала новые' },
            { value: 'oldest', label: 'Сначала старые' },
          ]}
        />
      </Space>

      <Space style={{ marginBottom: 16 }} wrap>
        <Button onClick={() => applyPreset('open')}>Пресет: новые</Button>
        <Button onClick={() => applyPreset('inProgress')}>Пресет: в работе</Button>
        <Button onClick={resetFilters}>Сбросить фильтры</Button>
      </Space>

      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}

      <List
        bordered
        loading={loading}
        dataSource={paginatedItems}
        renderItem={(item) => (
          <List.Item>
            <Space direction="vertical" size={0}>
              <Typography.Text strong>{item.title}</Typography.Text>
              <Typography.Text type="secondary">{new Date(item.createdAt).toLocaleString('ru-RU')}</Typography.Text>
            </Space>
            <Tag style={{ marginLeft: 'auto' }}>{item.status}</Tag>
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
            label="accountId (UUID)"
            name="accountId"
            rules={[{ required: true, message: 'Введите accountId' }, uuidRule]}
          >
            <Input />
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
          <Form.Item
            label="createdByUserId (UUID)"
            name="createdByUserId"
            rules={[{ required: true, message: 'Введите createdByUserId' }, uuidRule]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="assignedToUserId (UUID, опционально)" name="assignedToUserId" rules={[uuidRule]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
