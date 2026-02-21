import { Alert, Button, Form, Input, List, Modal, Select, Space, Tag, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
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

export function RequestsPage() {
  const [items, setItems] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<CreateRequestForm>();
  const [messageApi, contextHolder] = message.useMessage();

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

      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}

      <List
        bordered
        loading={loading}
        dataSource={items}
        renderItem={(item) => (
          <List.Item>
            {item.title}
            <Tag style={{ marginLeft: 'auto' }}>{item.status}</Tag>
          </List.Item>
        )}
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
