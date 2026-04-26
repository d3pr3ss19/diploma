import { Card, Space, Table, Tag, Typography } from 'antd';
import type { ServiceRequest } from '../../types/requests';

type Props = {
  rows: ServiceRequest[];
};

export function RecentTicketsTable({ rows }: Props) {
  return (
    <Card
      title="Последние заявки"
      extra={<Typography.Link>Все заявки →</Typography.Link>}
    >
      <Table
        rowKey="id"
        pagination={false}
        dataSource={rows}
        className="recent-table"
        columns={[
          { title: '№', dataIndex: 'id', render: (value: string) => <Typography.Link>#{value.slice(0, 4)}</Typography.Link> },
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
      <div className="table-footer-note">Показано {rows.length} из {rows.length} заявки</div>
    </Card>
  );
}
