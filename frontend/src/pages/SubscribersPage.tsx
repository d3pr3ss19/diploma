import { Table, Tag, Typography } from 'antd';

const data = [
  { key: '1', fullName: 'Иванов Иван', account: '100001', status: 'ACTIVE' },
  { key: '2', fullName: 'Петрова Анна', account: '100002', status: 'ACTIVE' },
];

export function SubscribersPage() {
  return (
    <>
      <Typography.Title level={3}>Абоненты</Typography.Title>
      <Table
        dataSource={data}
        columns={[
          { title: 'ФИО', dataIndex: 'fullName', key: 'fullName' },
          { title: 'Лицевой счёт', dataIndex: 'account', key: 'account' },
          {
            title: 'Статус',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => <Tag color="green">{status}</Tag>,
          },
        ]}
      />
    </>
  );
}
