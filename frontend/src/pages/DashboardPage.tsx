import { Card, Col, Row, Statistic, Typography } from 'antd';

const RUB_FORMATTER = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 2,
});

export function DashboardPage() {
  return (
    <>
      <Typography.Title level={3}>Панель мониторинга</Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
        «Суммарная задолженность» — агрегированный показатель по всем лицевым счетам в базе.
      </Typography.Paragraph>

      <Row gutter={16}>
        <Col span={8}>
          <Card>
            <Statistic title="Активные абоненты" value={1024} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="Открытые заявки" value={37} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="Суммарная задолженность" value={542300} formatter={(value) => RUB_FORMATTER.format(Number(value))} />
          </Card>
        </Col>
      </Row>
    </>
  );
}
