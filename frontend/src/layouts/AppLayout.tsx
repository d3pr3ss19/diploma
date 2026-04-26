import { CreditCardOutlined, DollarOutlined, FileTextOutlined, HomeOutlined, LogoutOutlined, SettingOutlined, TeamOutlined, ToolOutlined, UserOutlined } from '@ant-design/icons';
import { Button, ConfigProvider, Layout, Menu, Space, Typography, theme as antdTheme } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { clearAuth, readAuth } from '../app/auth-storage';
import { readTheme } from '../app/theme';

const { Header, Sider, Content, Footer } = Layout;


export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = readAuth();
  const [isDark, setIsDark] = useState(readTheme() === 'dark');


  const menuItems = [
    { key: '/dashboard', icon: <HomeOutlined />, label: 'Панель' },
    { key: '/subscribers', icon: <TeamOutlined />, label: 'Абоненты' },
    { key: '/requests', icon: <ToolOutlined />, label: 'Заявки' },
    { key: '/account', icon: <CreditCardOutlined />, label: 'Лицевой счёт' },
    { key: '/billing', icon: <DollarOutlined />, label: 'Оплата ЖКХ' },
    { key: '/profile', icon: <UserOutlined />, label: 'Профиль' },
    { key: '/settings', icon: <SettingOutlined />, label: 'Настройки' },
    ...(auth?.user.role === 'ADMIN' ? [{ key: '/logs', icon: <FileTextOutlined />, label: 'Логи' }] : []),
  ];

  useEffect(() => {
    function onThemeChange(event: Event) {
      const detail = (event as CustomEvent<'light' | 'dark'>).detail;
      setIsDark(detail === 'dark');
    }

    window.addEventListener('diploma-theme-change', onThemeChange as EventListener);
    return () => window.removeEventListener('diploma-theme-change', onThemeChange as EventListener);
  }, []);

  function handleLogout() {
    clearAuth();
    navigate('/login', { replace: true });
  }

  const bgMain = isDark ? '#0b1220' : '#f5f7fb';
  const bgCard = isDark ? '#111827' : '#fff';
  const borderColor = isDark ? '#334155' : '#f0f0f0';

  return (
    <ConfigProvider locale={ruRU} theme={{ algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm, token: { fontSize: 17 } }}>
    <Layout style={{ minHeight: '100vh', background: bgMain, alignItems: 'center' }}>
      <Layout
        style={{
          width: 'min(92vw, 1800px)',
          minWidth: 1160,
          boxShadow: '0 0 24px rgba(15, 23, 42, 0.16)',
          margin: '0 auto',
        }}
      >
        <Sider width={280} theme={isDark ? 'dark' : 'light'} style={{ borderRight: `1px solid ${borderColor}` }}>
          <div style={{ padding: 20, color: '#1677ff', fontWeight: 700, fontSize: 22 }}>КП ИС</div>
          <Menu
            theme={isDark ? 'dark' : 'light'}
            mode="inline"
            selectedKeys={[location.pathname]}
            style={{ fontSize: 18 }}
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
              <Typography.Text>{auth?.user.fullName || auth?.user.email}</Typography.Text>
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
