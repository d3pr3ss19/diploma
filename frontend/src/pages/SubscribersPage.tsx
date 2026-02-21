import { Alert, Button, Form, Input, Modal, Space, Table, Tag, Typography, message } from 'antd';
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

const uuidRule = {
  pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  message: 'Введите корректный UUID',
};

export function SubscribersPage() {
  const [items, setItems] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<CreateSubscriberForm>();
  const [messageApi, contextHolder] = message.useMessage();

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
      messageApi.success('Абонент успешно создан');
      await loadSubscribers();
    } catch {
      setError('Не удалось создать абонента. Проверьте валидность данных и права доступа.');
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
