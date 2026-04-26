import { Card, Select, Space, Typography } from 'antd';
import type { ChartPoint } from './types';

type Props = {
  points: ChartPoint[];
};

export function PaymentsChart({ points }: Props) {
  const maxValue = 20000;
  const chartHeight = 200;
  const chartWidth = 680;
  const leftPadding = 50;
  const barWidth = 10;
  const groupWidth = (chartWidth - leftPadding - 20) / points.length;

  return (
    <Card
      title="Оплаты и начисления"
      extra={<Select defaultValue="30" options={[{ value: '30', label: 'За 30 дней' }]} style={{ width: 130 }} />}
    >
      <Space size={16} style={{ marginBottom: 8 }}>
        <Space><span className="legend-dot legend-dot--blue" />Начисления</Space>
        <Space><span className="legend-dot legend-dot--green" />Оплаты</Space>
      </Space>
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 38}`} className="payments-chart">
        {[0, 5000, 10000, 15000, 20000].map((tick) => {
          const y = chartHeight - (tick / maxValue) * chartHeight;
          return (
            <g key={tick}>
              <line x1={leftPadding} y1={y} x2={chartWidth} y2={y} className="payments-chart__grid" />
              <text x={8} y={y + 4} className="payments-chart__axis">{tick.toLocaleString('ru-RU')} ₽</text>
            </g>
          );
        })}
        {points.map((point, index) => {
          const x = leftPadding + index * groupWidth + 4;
          const accrualHeight = (point.accruals / maxValue) * chartHeight;
          const paymentHeight = (point.payments / maxValue) * chartHeight;
          return (
            <g key={point.label}>
              <rect x={x} y={chartHeight - accrualHeight} width={barWidth} height={accrualHeight} rx={3} className="payments-chart__bar payments-chart__bar--blue" />
              <rect x={x + barWidth + 4} y={chartHeight - paymentHeight} width={barWidth} height={paymentHeight} rx={3} className="payments-chart__bar payments-chart__bar--green" />
              <text x={x + 4} y={chartHeight + 24} className="payments-chart__axis">{point.label}</text>
            </g>
          );
        })}
      </svg>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Данные демонстрационные, структура готова для подстановки API значений.
      </Typography.Text>
    </Card>
  );
}
