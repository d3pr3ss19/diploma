import { Button, Card, Empty, Space, Table, Tag, Typography } from 'antd';
import type { ServiceRequest } from '../../types/requests';

type Props = {
  rows: ServiceRequest[];
  loading?: boolean;
  onOpenAll: () => void;
  onCreate: () => void;
  onOpenRow: (id: string) => void;
};

export function RecentTicketsTable({ rows, loading, onOpenAll, onCreate, onOpenRow }: Props) {
  return (
    <Card
      title="Последние заявки"
      extra={<Typography.Link onClick={onOpenAll}>Все заявки →</Typography.Link>}
    >
      {!loading && rows.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space direction="vertical" size={0}>
              <Typography.Text strong>Заявок пока нет</Typography.Text>
              <Typography.Text type="secondary">Создайте первую заявку, чтобы она появилась в этом списке.</Typography.Text>
            </Space>
          }
        >
          <Button type="primary" onClick={onCreate}>Создать заявку</Button>
        </Empty>
      ) : null}
      <Table
        rowKey="id"
        pagination={false}
        dataSource={rows}
        className="recent-table"
        loading={loading}
        style={{ display: rows.length ? 'block' : 'none' }}
        columns={[
          { title: '№', dataIndex: 'id', render: (value: string) => <Typography.Link onClick={() => onOpenRow(value)}>#{value.slice(0, 4)}</Typography.Link> },
          {
            title: 'Абонент',
            render: (_: unknown, row: ServiceRequest) => (
              <Space direction="vertical" size={0}>
                <Typography.Text>Иванов И.И.</Typography.Text>
                <Typography.Text type="secondary">Лиц. счёт: 000123</Typography.Text>
              </Space>
            ),
          },
          {
            title: 'Тема',
            render: (_: unknown, row: ServiceRequest) => (
              <Space direction="vertical" size={0}>
                <Typography.Text>{row.title}</Typography.Text>
                <Typography.Text type="secondary">ул. Ленина, 10, п. 2</Typography.Text>
              </Space>
            ),
          },
          { title: 'Статус', dataIndex: 'status', render: () => <Tag color="blue">Открыта</Tag> },
          { title: 'Приоритет', render: () => <Tag color="gold">Средний</Tag> },
          { title: 'Дата', dataIndex: 'createdAt', render: (value: string) => new Date(value).toLocaleString('ru-RU') },
        ]}
      />
      {rows.length ? <div className="table-footer-note">Показано {rows.length} из {rows.length} заявки</div> : null}
    </Card>
  );
}
