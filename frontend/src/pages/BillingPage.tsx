import { Alert, Button, Card, Col, DatePicker, Descriptions, Form, InputNumber, Row, Select, Space, Statistic, Table, Tabs, Tag, Typography, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import { readAuth } from '../app/auth-storage';
import { getBillingAdminLogs, getBillingRegions, getBillingSummary, getMyBillingNotification, getTariffs, payFromBalance, submitReading, topUpBalance } from '../api/billing';
import { getMySubscriber, getSubscribers } from '../api/subscribers';
import { extractApiErrorMessage } from '../api/error';
import type { Subscriber } from '../types/subscribers';
import type { BillingSummary, TariffMap } from '../types/billing';

function meterLabel(type: 'COLD_WATER' | 'HOT_WATER' | 'ELECTRICITY') {
  if (type === 'COLD_WATER') return 'Холодная вода';
  if (type === 'HOT_WATER') return 'Горячая вода';
  return 'Электроэнергия';
}

type BillingAdminLog = {
  id: string;
  action: string;
  createdAt: string;
  details?: Record<string, unknown>;
  actorUser?: { id: number; email: string; fullName?: string | null } | null;
};

export function BillingPage() {
  const auth = readAuth();
  const isSubscriber = auth?.user.role === 'SUBSCRIBER';
  const isAdmin = auth?.user.role === 'ADMIN';
  const [messageApi, contextHolder] = message.useMessage();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(undefined);

  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [regions, setRegions] = useState<string[]>([]);
  const [region, setRegion] = useState<string>(auth?.user.region ?? 'Москва');
  const [tariffs, setTariffs] = useState<TariffMap | null>(null);
  const [adminLogs, setAdminLogs] = useState<BillingAdminLog[]>([]);
  const [paymentNotification, setPaymentNotification] = useState<{ shouldNotify: boolean; dayOfMonth: number; notifications: Array<{ accountId: string; accountNumber: string; balance: number; monthAccrued: number; needPayment: boolean; text: string }> } | null>(null);

  const [readingForm] = Form.useForm();
  const [topupForm] = Form.useForm();
  const [payForm] = Form.useForm();

  const [saving, setSaving] = useState(false);

  const accountOptions = useMemo(() => {
    if (isSubscriber) {
      const owner = subscribers[0];
      return (owner?.accounts ?? []).map((account) => ({
        value: account.id,
        label: `${owner?.fullName ?? 'Абонент'} · ${account.accountNumber ?? account.id} · ${account.balance} ₽`
      }));
    }

    return subscribers.flatMap((subscriber) => (subscriber.accounts ?? []).map((account) => ({
      value: account.id,
      label: `${subscriber.fullName} · ${account.accountNumber ?? account.id} · ${account.balance} ₽`
    })));
  }, [isSubscriber, subscribers]);

  useEffect(() => {
    void loadInitial();
  }, []);

  useEffect(() => {
    if (!selectedAccountId) {
      setSummary(null);
      return;
    }

    void loadSummary(selectedAccountId);
  }, [selectedAccountId]);

  useEffect(() => {
    void loadTariffs(region);
  }, [region]);

  async function loadInitial() {
    try {
      setLoading(true);
      setError(null);

      const [availableRegions, subscriberData] = await Promise.all([
        getBillingRegions(),
        isSubscriber ? getMySubscriber().then((item) => [item]) : getSubscribers(),
      ]);

      setRegions(availableRegions);
      setSubscribers(subscriberData);

      const firstAccountId = (isSubscriber ? subscriberData[0]?.accounts : subscriberData.flatMap((item) => item.accounts ?? []))?.[0]?.id;
      if (firstAccountId) {
        setSelectedAccountId(firstAccountId);
      }

      if (isSubscriber && auth?.user.region) {
        setRegion(auth.user.region);
      }

      if (isAdmin) {
        const logs = await getBillingAdminLogs(150);
        setAdminLogs(logs);
      }

      if (isSubscriber) {
        const notification = await getMyBillingNotification();
        setPaymentNotification(notification);
      }
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Не удалось загрузить раздел оплаты и начислений.'));
    } finally {
      setLoading(false);
    }
  }

  async function loadSummary(accountId: string) {
    try {
      const data = await getBillingSummary(accountId);
      setSummary(data);
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Не удалось загрузить сводку по лицевому счёту.'));
      setSummary(null);
    }
  }

  async function loadTariffs(regionCode: string) {
    try {
      const data = await getTariffs(regionCode);
      setTariffs(data.tariffs);
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Не удалось загрузить тарифы.'));
      setTariffs(null);
    }
  }

  async function handleSubmitReading(values: { meterType: 'COLD_WATER' | 'HOT_WATER' | 'ELECTRICITY'; value: number; period: { format: (template: string) => string } }) {
    if (!selectedAccountId) return;

    try {
      setSaving(true);
      await submitReading(selectedAccountId, {
        meterType: values.meterType,
        value: Number(values.value),
        period: `${values.period.format('YYYY-MM')}-01`,
        region,
      });
      messageApi.success('Показания приняты, начисление выполнено автоматически.');
      readingForm.resetFields(['value']);
      await loadSummary(selectedAccountId);
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Не удалось отправить показания.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleTopUp(values: { amount: number; method: 'CARD' | 'BANK_TRANSFER' }) {
    if (!selectedAccountId) return;

    try {
      setSaving(true);
      await topUpBalance(selectedAccountId, { amount: Number(values.amount), method: values.method });
      messageApi.success('Счёт пополнен (макет платежа).');
      topupForm.resetFields(['amount']);
      await loadSummary(selectedAccountId);
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Не удалось пополнить счёт.'));
    } finally {
      setSaving(false);
    }
  }

  async function handlePay(values: { amount: number; method: 'CARD' | 'BANK_TRANSFER' }) {
    if (!selectedAccountId) return;

    try {
      setSaving(true);
      await payFromBalance(selectedAccountId, { amount: Number(values.amount), method: values.method });
      messageApi.success('Оплата услуг выполнена с лицевого счёта (макет).');
      payForm.resetFields(['amount']);
      await loadSummary(selectedAccountId);
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Не удалось провести оплату.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {contextHolder}
      <Typography.Title level={3} style={{ margin: 0 }}>
        Оплата и коммунальные услуги (демо)
      </Typography.Title>

      {error ? <Alert type="error" showIcon message={error} /> : null}

      <Card loading={loading}>
        <Space wrap>
          <Select
            style={{ width: 360 }}
            placeholder="Лицевой счёт"
            value={selectedAccountId}
            options={accountOptions}
            onChange={setSelectedAccountId}
          />
          <Select
            style={{ width: 220 }}
            value={region}
            showSearch
            optionFilterProp="label"
            options={regions.map((item) => ({ value: item, label: item }))}
            onChange={setRegion}
          />
        </Space>
      </Card>

      {isSubscriber && paymentNotification?.shouldNotify && paymentNotification.notifications.length > 0 ? (
        <Alert
          type="warning"
          showIcon
          message={`Напоминание: до ${paymentNotification.dayOfMonth} числа нужно оплатить начисления`}
          description={paymentNotification.notifications.map((item) => `${item.accountNumber}: начислено ${item.monthAccrued.toFixed(2)} ₽, баланс ${item.balance.toFixed(2)} ₽`).join(' · ')}
        />
      ) : null}

      {summary ? (
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card>
              <Statistic title="Лицевой счёт" value={summary.account.accountNumber} />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card>
              <Typography.Text type="secondary">Текущий баланс</Typography.Text>
              <div>
                <Tag color={Number(summary.account.balance) >= 0 ? 'green' : 'red'} style={{ fontSize: 16, padding: '4px 10px', marginTop: 8 }}>
                  {summary.account.balance} ₽
                </Tag>
              </div>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card>
              <Statistic title="Начислено / оплачено" value={`${summary.totals.accrued.toFixed(2)} ₽ / ${summary.totals.paid.toFixed(2)} ₽`} />
            </Card>
          </Col>
        </Row>
      ) : null}

      <Space align="start" size={16} wrap>
        <Card title="Передать показания" style={{ minWidth: 380 }}>
          <Form form={readingForm} layout="vertical" onFinish={(values) => void handleSubmitReading(values as never)}>
            <Form.Item name="meterType" label="Тип счётчика" rules={[{ required: true, message: 'Выберите тип' }]}>
              <Select
                options={[
                  { value: 'COLD_WATER', label: 'Холодная вода' },
                  { value: 'HOT_WATER', label: 'Горячая вода' },
                  { value: 'ELECTRICITY', label: 'Электроэнергия' },
                ]}
              />
            </Form.Item>
            <Form.Item name="value" label="Текущее показание" rules={[{ required: true, message: 'Введите показание' }]}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="period" label="Период начисления" rules={[{ required: true, message: 'Выберите период' }]}>
              <DatePicker picker="month" style={{ width: '100%' }} />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={saving} block>
              Рассчитать и начислить
            </Button>
          </Form>
        </Card>

        <Card title="Пополнить лицевой счёт" style={{ minWidth: 340 }}>
          <Form form={topupForm} layout="vertical" onFinish={(values) => void handleTopUp(values as never)} initialValues={{ method: 'CARD' }}>
            <Form.Item name="amount" label="Сумма" rules={[{ required: true, message: 'Введите сумму' }]}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="method" label="Метод" rules={[{ required: true, message: 'Выберите метод' }]}>
              <Select options={[{ value: 'CARD', label: 'Банковская карта' }, { value: 'BANK_TRANSFER', label: 'Банковский перевод' }]} />
            </Form.Item>
            <Button htmlType="submit" type="primary" ghost loading={saving} block>
              Пополнить (mock)
            </Button>
          </Form>
        </Card>

        <Card title="Оплатить услуги с баланса" style={{ minWidth: 340 }}>
          <Form form={payForm} layout="vertical" onFinish={(values) => void handlePay(values as never)} initialValues={{ method: 'CARD' }}>
            <Form.Item name="amount" label="Сумма" rules={[{ required: true, message: 'Введите сумму' }]}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="method" label="Метод" rules={[{ required: true, message: 'Выберите метод' }]}>
              <Select options={[{ value: 'CARD', label: 'Банковская карта' }, { value: 'BANK_TRANSFER', label: 'Банковский перевод' }]} />
            </Form.Item>
            <Button htmlType="submit" danger loading={saving} block>
              Оплатить услуги
            </Button>
          </Form>
        </Card>
      </Space>

      <Card title={`Тарифы региона: ${region}`}>
        <Space direction="vertical">
          <Typography.Text>Холодная вода: {tariffs?.COLD_WATER ?? '—'} ₽ / м³</Typography.Text>
          <Typography.Text>Горячая вода: {tariffs?.HOT_WATER ?? '—'} ₽ / м³</Typography.Text>
          <Typography.Text>Электроэнергия: {tariffs?.ELECTRICITY ?? '—'} ₽ / кВт⋅ч</Typography.Text>
        </Space>
      </Card>

      <Card>
        <Tabs
          items={[
            {
              key: 'payments',
              label: 'История операций',
              children: (
                <Table
                  rowKey="id"
                  pagination={false}
                  dataSource={summary?.account.payments ?? []}
                  columns={[
                    { title: 'Дата', dataIndex: 'paymentDate', render: (value: string) => new Date(value).toLocaleDateString('ru-RU') },
                    { title: 'Сумма', dataIndex: 'amount', render: (value: string) => `${value} ₽` },
                    { title: 'Метод', dataIndex: 'method' },
                    { title: 'Референс', dataIndex: 'externalRef', render: (value?: string | null) => value ?? '—' },
                  ]}
                />
              ),
            },
            {
              key: 'accruals',
              label: 'Последние начисления',
              children: (
                <Table
                  rowKey="id"
                  pagination={false}
                  dataSource={summary?.account.accruals ?? []}
                  columns={[
                    { title: 'Период', dataIndex: 'period', render: (value: string) => new Date(value).toLocaleDateString('ru-RU') },
                    { title: 'Услуга', dataIndex: 'serviceType', render: (value: 'COLD_WATER' | 'HOT_WATER' | 'ELECTRICITY') => meterLabel(value) },
                    { title: 'Потребление', dataIndex: 'consumption' },
                    { title: 'Сумма', dataIndex: 'amount', render: (value: string) => `${value} ₽` },
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>

      {isAdmin ? (
        <Card title="Админ-логи по оплатам и начислениям">
          <Table
            rowKey="id"
            pagination={{ pageSize: 10 }}
            dataSource={adminLogs}
            columns={[
              { title: 'Когда', dataIndex: 'createdAt', render: (value: string) => new Date(value).toLocaleString('ru-RU') },
              { title: 'Действие', dataIndex: 'action' },
              { title: 'Кто', render: (_: unknown, row: BillingAdminLog) => row.actorUser?.fullName ?? row.actorUser?.email ?? 'Система' },
              { title: 'Детали', render: (_: unknown, row: BillingAdminLog) => JSON.stringify(row.details ?? {}) },
            ]}
          />
        </Card>
      ) : null}
    </Space>
  );
}
