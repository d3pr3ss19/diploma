import { CreditCardOutlined, HomeOutlined, LogoutOutlined, SettingOutlined, TeamOutlined, ToolOutlined } from '@ant-design/icons';
import { Button, ConfigProvider, Layout, Menu, Space, Typography } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { clearAuth, readAuth } from '../app/auth-storage';
import { readTheme } from '../app/theme';

const { Header, Sider, Content, Footer } = Layout;

const menuItems = [
  { key: '/dashboard', icon: <HomeOutlined />, label: 'Панель' },
  { key: '/subscribers', icon: <TeamOutlined />, label: 'Абоненты' },
  { key: '/requests', icon: <ToolOutlined />, label: 'Заявки' },
  { key: '/account', icon: <CreditCardOutlined />, label: 'Лицевой счёт' },
  { key: '/settings', icon: <SettingOutlined />, label: 'Настройки' },
];

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = readAuth();
  const isDark = readTheme() === 'dark';

  function handleLogout() {
    clearAuth();
    navigate('/login', { replace: true });
  }

  const bgMain = isDark ? '#0f172a' : '#f5f7fb';
  const bgCard = isDark ? '#111827' : '#fff';
  const borderColor = isDark ? '#1f2937' : '#f0f0f0';

  return (
    <ConfigProvider componentSize="large" theme={{ token: { fontSize: 16 } }}>
      <Layout style={{ minHeight: '100vh', background: bgMain, alignItems: 'center' }}>
        <Layout
          style={{
            width: 'min(90vw, 1800px)',
            minWidth: 1100,
            boxShadow: '0 0 24px rgba(15, 23, 42, 0.08)',
            margin: '0 auto',
          }}
        >
          <Sider theme={isDark ? 'dark' : 'light'} style={{ borderRight: `1px solid ${borderColor}` }}>
            <div style={{ padding: 16, color: '#1677ff', fontWeight: 700 }}>КП ИС</div>
            <Menu
              theme={isDark ? 'dark' : 'light'}
              mode="inline"
              selectedKeys={[location.pathname]}
              items={menuItems}
              onClick={({ key }) => navigate(key)}
            />
          </Sider>
          <Layout style={{ background: bgMain }}>
            <Header
              style={{
                background: bgCard,
                borderBottom: `1px solid ${borderColor}`,
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
            <Content style={{ padding: 24, background: bgMain }}>
              <Outlet />
            </Content>
            <Footer style={{ textAlign: 'center', background: bgCard, borderTop: `1px solid ${borderColor}` }}>
              Дипломная работа. БИА22-02, Гуров Станислав Вячеславович, 2026
            </Footer>
          </Layout>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}
