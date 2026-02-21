import { Alert, Button, Form, Input, Modal, Space, Table, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { createSubscriber, getSubscribers } from '../api/subscribers';
import type { Subscriber } from '../types/subscribers';

type CreateSubscriberForm = {
  fullName: string;
  phone: string;
  address: string;
  apartment?: string;
  userId?: string;
};

export function SubscribersPage() {
  const [items, setItems] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<CreateSubscriberForm>();

  async function loadSubscribers() {
    try {
      setLoading(true);
      setError(null);
      const data = await getSubscribers();
      setItems(data);
    } catch {
      setError('Не удалось загрузить абонентов. Проверьте backend и токен.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSubscribers();
  }, []);

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
      await loadSubscribers();
    } catch {
      setError('Не удалось создать абонента. Проверьте валидность данных и права доступа.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Абоненты
        </Typography.Title>
        <Button type="primary" onClick={() => setModalOpen(true)}>
          Добавить абонента
        </Button>
      </Space>

      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}

      <Table
        rowKey="id"
        loading={loading}
        dataSource={items}
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
          <Form.Item label="ФИО" name="fullName" rules={[{ required: true, min: 5 }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Телефон (+380...)" name="phone" rules={[{ required: true }]}>
            <Input placeholder="+380501112233" />
          </Form.Item>
          <Form.Item label="Адрес" name="address" rules={[{ required: true, min: 5 }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Квартира" name="apartment">
            <Input />
          </Form.Item>
          <Form.Item label="userId (UUID, опционально)" name="userId">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
