import { RightOutlined } from '@ant-design/icons';
import { Card, Space, Typography } from 'antd';
import type { ReactNode } from 'react';

type Props = {
  icon: ReactNode;
  colorClass: string;
  title: string;
  value: string | number;
  label: string;
  status: string;
};

export function KpiCard({ icon, colorClass, title, value, label, status }: Props) {
  return (
    <Card className="kpi-card">
      <div className="kpi-card__top">
        <div className={`kpi-card__icon ${colorClass}`}>{icon}</div>
        <div className="kpi-card__meta">
          <Typography.Text className="kpi-card__title">{title}</Typography.Text>
          <Typography.Text className="kpi-card__value">{value}</Typography.Text>
          <Typography.Text className="kpi-card__label">{label}</Typography.Text>
          <Typography.Text className="kpi-card__status">{status}</Typography.Text>
        </div>
        <RightOutlined className="kpi-card__chevron" />
      </div>
      <Typography.Link className="kpi-card__link">Открыть →</Typography.Link>
    </Card>
  );
}
