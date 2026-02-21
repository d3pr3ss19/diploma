import { List, Tag, Typography } from 'antd';

const requests = [
  { id: 'REQ-1', title: 'Протечка в подъезде', status: 'NEW' },
  { id: 'REQ-2', title: 'Нет горячей воды', status: 'IN_PROGRESS' },
];

export function RequestsPage() {
  return (
    <>
      <Typography.Title level={3}>Заявки</Typography.Title>
      <List
        bordered
        dataSource={requests}
        renderItem={(item) => (
          <List.Item>
            {item.id} — {item.title} <Tag style={{ marginLeft: 'auto' }}>{item.status}</Tag>
          </List.Item>
        )}
      />
    </>
  );
}
