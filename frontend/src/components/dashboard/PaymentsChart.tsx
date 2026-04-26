import { Button, Card, Empty, Select, Space, Typography } from 'antd';
import type { ChartPoint } from './types';

type Props = {
  points: ChartPoint[];
  loading?: boolean;
  period: string;
  onPeriodChange: (value: string) => void;
  onOpenBilling: () => void;
};

export function PaymentsChart({ points, loading, period, onPeriodChange, onOpenBilling }: Props) {
  const maxValue = 20000;
  const chartHeight = 200;
  const chartWidth = 680;
  const leftPadding = 50;
  const barWidth = 10;
  const groupWidth = (chartWidth - leftPadding - 20) / points.length;

  return (
    <Card
      title="Оплаты и начисления"
      extra={<Select value={period} options={[{ value: '7', label: 'За 7 дней' }, { value: '30', label: 'За 30 дней' }, { value: 'month', label: 'За месяц' }, { value: 'year', label: 'За год' }]} style={{ width: 130 }} onChange={onPeriodChange} />}
    >
      {loading ? <Typography.Text type="secondary">Загрузка графика...</Typography.Text> : null}
      {!loading && points.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space direction="vertical" size={0}>
              <Typography.Text strong>Нет данных за выбранный период</Typography.Text>
              <Typography.Text type="secondary">Начисления и оплаты появятся здесь после проведения операций.</Typography.Text>
            </Space>
          }
        >
          <Button onClick={onOpenBilling}>Открыть оплату ЖКХ</Button>
        </Empty>
      ) : null}
      {!loading && points.length > 0 ? (
        <>
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
        </>
      ) : null}
    </Card>
  );
}
