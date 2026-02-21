import { CreditCardOutlined, HomeOutlined, LogoutOutlined, TeamOutlined, ToolOutlined } from '@ant-design/icons';
import { Button, Layout, Menu, Space, Typography } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { clearAuth, readAuth } from '../app/auth-storage';

const { Header, Sider, Content } = Layout;

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
    <Layout style={{ minHeight: '100vh' }}>
      <Sider>
        <div style={{ padding: 16, color: '#fff', fontWeight: 600 }}>КП ИС</div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
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
        <Content style={{ padding: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
