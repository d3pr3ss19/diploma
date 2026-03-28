import { Card, Col, Row, Statistic, Typography } from 'antd';

export function DashboardPage() {
  return (
    <>
      <Typography.Title level={3}>Панель мониторинга</Typography.Title>
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
            <Statistic title="Долг, грн" value={542300} precision={2} />
          </Card>
        </Col>
      </Row>
    </>
  );
}
