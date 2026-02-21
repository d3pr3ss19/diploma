import { Alert, Button, Form, Input, List, Modal, Select, Space, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { createRequest, getRequests } from '../api/requests';
import type { ServiceRequest } from '../types/requests';

type CreateRequestForm = {
  accountId: string;
  title: string;
  description: string;
  category: 'ACCIDENT' | 'COMPLAINT' | 'QUESTION';
  createdByUserId: string;
  assignedToUserId?: string;
};

export function RequestsPage() {
  const [items, setItems] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<CreateRequestForm>();

  async function loadRequests() {
    try {
      setLoading(true);
      setError(null);
      const data = await getRequests();
      setItems(data);
    } catch {
      setError('Не удалось загрузить заявки. Проверьте backend и токен.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRequests();
  }, []);

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
      await loadRequests();
    } catch {
      setError('Не удалось создать заявку. Проверьте UUID-поля и права доступа.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Заявки
        </Typography.Title>
        <Button type="primary" onClick={() => setModalOpen(true)}>
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
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{ category: 'QUESTION' as const }}
        >
          <Form.Item label="accountId (UUID)" name="accountId" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Заголовок" name="title" rules={[{ required: true, min: 5 }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Описание" name="description" rules={[{ required: true, min: 10 }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="Категория" name="category" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'ACCIDENT', label: 'Авария' },
                { value: 'COMPLAINT', label: 'Жалоба' },
                { value: 'QUESTION', label: 'Вопрос' },
              ]}
            />
          </Form.Item>
          <Form.Item label="createdByUserId (UUID)" name="createdByUserId" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="assignedToUserId (UUID, опционально)" name="assignedToUserId">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
