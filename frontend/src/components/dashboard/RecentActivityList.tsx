import { ProfileOutlined } from '@ant-design/icons';
import { Card, Empty, Space, Typography } from 'antd';
import type { ReactNode } from 'react';

const fallbackIcon = <ProfileOutlined />;

type ActivityItem = {
  key: string;
  icon?: ReactNode;
  title: string;
  subtitle: string;
  date: string;
};

export function RecentActivityList({ items, loading, onOpenAll }: { items: ActivityItem[]; loading?: boolean; onOpenAll: () => void }) {
  return (
    <Card title="Последние действия" extra={<Typography.Link onClick={onOpenAll}>Все логи →</Typography.Link>}>
      {!loading && items.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space direction="vertical" size={0}>
              <Typography.Text strong>Действий пока нет</Typography.Text>
              <Typography.Text type="secondary">События появятся после операций в системе.</Typography.Text>
            </Space>
          }
        />
      ) : null}
      <Space direction="vertical" style={{ width: '100%' }} size={10}>
        {items.slice(0, 4).map((item) => (
          <div key={item.key} className="activity-row">
            <div className="activity-row__icon">{item.icon ?? fallbackIcon}</div>
            <div className="activity-row__meta">
              <Typography.Text strong style={{ fontSize: 13 }}>{item.title}</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>{item.subtitle}</Typography.Text>
            </div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{item.date}</Typography.Text>
          </div>
        ))}
      </Space>
    </Card>
  );
}
