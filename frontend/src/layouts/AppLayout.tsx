import { CreditCardOutlined, HomeOutlined, LogoutOutlined, TeamOutlined, ToolOutlined } from '@ant-design/icons';
import { Button, Layout, Menu, Space, Typography } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { clearAuth, readAuth } from '../app/auth-storage';

const { Header, Sider, Content, Footer } = Layout;

const menuItems = [
  { key: '/dashboard', icon: <HomeOutlined />, label: 'Панель' },
  { key: '/subscribers', icon: <TeamOutlined />, label: 'Абоненты' },
  { key: '/requests', icon: <ToolOutlined />, label: 'Заявки' },
  { key: '/account', icon: <CreditCardOutlined />, label: 'Лицевой счёт' },
];

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = readAuth();

  function handleLogout() {
    clearAuth();
    navigate('/login', { replace: true });
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fb', alignItems: 'center' }}>
      <Layout
        style={{
          width: 'min(80vw, 1600px)',
          minWidth: 1000,
          boxShadow: '0 0 24px rgba(15, 23, 42, 0.08)',
          margin: '0 auto',
        }}
      >
        <Sider theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
          <div style={{ padding: 16, color: '#1677ff', fontWeight: 700 }}>КП ИС</div>
          <Menu
            theme="light"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
          />
        </Sider>
        <Layout style={{ background: '#f5f7fb' }}>
          <Header
            style={{
              background: '#fff',
              borderBottom: '1px solid #f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography.Title level={5} style={{ margin: 0 }}>
              Веб-ориентированная ИС коммунального предприятия
            </Typography.Title>
            <Space>
              <Typography.Text type="secondary">{auth?.user.email}</Typography.Text>
              <Button icon={<LogoutOutlined />} onClick={handleLogout}>
                Выход
              </Button>
            </Space>
          </Header>
          <Content style={{ padding: 24, background: '#f5f7fb' }}>
            <Outlet />
          </Content>
          <Footer style={{ textAlign: 'center', background: '#fff', borderTop: '1px solid #f0f0f0' }}>
            Дипломная работа. БИА22-02, Гурова Станислава Вячеславовича
          </Footer>
        </Layout>
      </Layout>
    </Layout>
  );
}
