import { CheckCircleFilled } from '@ant-design/icons';
import { Card, Col, Progress, Row, Space, Statistic, Typography } from 'antd';

type Props = {
  totalDebt: number;
  debtorsCount: number;
};

export function DebtStatusCard({ totalDebt, debtorsCount }: Props) {
  return (
    <Card title="Статус задолженности">
      <Row gutter={16} align="middle">
        <Col span={12}>
          <Space direction="vertical" size={12}>
            <Statistic title="Общая задолженность" value={`${totalDebt.toLocaleString('ru-RU')} ₽`} />
            <Statistic title="Должников" value={debtorsCount} />
          </Space>
        </Col>
        <Col span={12} style={{ display: 'flex', justifyContent: 'center' }}>
          <Progress type="circle" percent={0} strokeColor="#16A34A" format={() => '0%\nпросрочено'} />
        </Col>
      </Row>
      <div className="debt-status__footer">
        <CheckCircleFilled style={{ color: '#16A34A' }} />
        <Typography.Text style={{ color: '#16A34A' }}>Нет просроченной задолженности</Typography.Text>
      </div>
    </Card>
  );
}
