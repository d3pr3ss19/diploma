import { CreditCardOutlined, DollarOutlined, FileTextOutlined, HomeOutlined, LogoutOutlined, SettingOutlined, TeamOutlined, ToolOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Button, ConfigProvider, Layout, Menu, Space, Tag, Typography, theme as antdTheme } from 'antd';
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

  const userInitials = (auth?.user.fullName ?? auth?.user.email ?? 'П')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <ConfigProvider
      locale={ruRU}
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          fontSize: 16,
          borderRadius: 12,
          colorPrimary: isDark ? '#6d95ff' : '#2f6bff',
        },
      }}
    >
    <Layout className="app-shell" style={{ alignItems: 'center' }}>
      <Layout className="app-shell__frame" style={{ margin: '0 auto' }}>
        <Sider width={276} theme="light" className="app-sider" style={{ borderRight: '1px solid var(--app-border)' }}>
          <div className="app-sidebar-brand">
            <Typography.Text strong style={{ fontSize: 30, lineHeight: 1, color: 'inherit' }}>КП ИС</Typography.Text>
            <div style={{ marginTop: 8, fontSize: 14, opacity: 0.92 }}>Цифровой кабинет коммунального предприятия</div>
          </div>
          <Menu
            className="app-menu"
            theme="light"
            mode="inline"
            selectedKeys={[location.pathname]}
            style={{ fontSize: 16, borderInlineEnd: 'none', paddingInline: 10, background: 'transparent' }}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
          />
        </Sider>
        <Layout className="app-page">
          <Header className="app-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <Space direction="vertical" size={1} style={{ minWidth: 0, flex: 1 }}>
              <Typography.Text strong style={{ fontSize: 24, lineHeight: 1.2 }}>
                Веб-ориентированная ИС коммунального предприятия
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 14, whiteSpace: 'normal', lineHeight: 1.4 }}>
                Единая панель для абонентов, операторов и администраторов
              </Typography.Text>
            </Space>
            <Space style={{ flexShrink: 0 }}>
              <Avatar style={{ background: 'linear-gradient(135deg, var(--app-accent), var(--app-accent-strong))' }}>{userInitials}</Avatar>
              <Space direction="vertical" size={0}>
                <Typography.Text>{auth?.user.fullName || auth?.user.email}</Typography.Text>
                <Tag bordered={false} color={isDark ? 'processing' : 'blue'} style={{ marginInlineEnd: 0, width: 'fit-content' }}>
                  {auth?.user.role}
                </Tag>
              </Space>
              <Button icon={<LogoutOutlined />} onClick={handleLogout} className="app-card-soft">
                Выход
              </Button>
            </Space>
          </Header>
          <Content className="app-content">
            <Outlet />
          </Content>
          <Footer className="app-footer" style={{ textAlign: 'center' }}>
            Дипломная работа. БИА22-02, Гуров Станислав Вячеславович, 2026
          </Footer>
        </Layout>
      </Layout>
    </Layout>
    </ConfigProvider>
  );
}
