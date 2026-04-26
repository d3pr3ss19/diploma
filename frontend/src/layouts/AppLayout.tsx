import { BellOutlined, CreditCardOutlined, DollarOutlined, DownOutlined, FileTextOutlined, HomeOutlined, LogoutOutlined, QuestionCircleOutlined, SearchOutlined, SettingOutlined, TeamOutlined, ToolOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Badge, Button, ConfigProvider, Dropdown, Empty, Input, Layout, Menu, Popover, Space, Typography, theme as antdTheme } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { clearAuth, readAuth } from '../app/auth-storage';
import { useNotifications } from '../app/notifications';
import { readTheme } from '../app/theme';

const { Header, Sider, Content, Footer } = Layout;


export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = readAuth();
  const [isDark, setIsDark] = useState(readTheme() === 'dark');
  const notifications = useNotifications();


  const menuItems = [
    { type: 'group' as const, label: 'ОСНОВНОЕ', children: [
      { key: '/dashboard', icon: <HomeOutlined />, label: 'Панель' },
      { key: '/subscribers', icon: <TeamOutlined />, label: 'Абоненты' },
      { key: '/requests', icon: <ToolOutlined />, label: 'Заявки' },
    ] },
    { type: 'group' as const, label: 'ФИНАНСЫ', children: [
      { key: '/account', icon: <CreditCardOutlined />, label: 'Лицевой счёт' },
      { key: '/billing', icon: <DollarOutlined />, label: 'Оплата ЖКХ' },
    ] },
    { type: 'group' as const, label: 'СИСТЕМА', children: [
      ...(auth?.user.role === 'ADMIN' ? [{ key: '/logs', icon: <FileTextOutlined />, label: 'Логи' }] : []),
    ] },
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
        <Sider width={248} theme="light" className="app-sider" style={{ borderRight: '1px solid var(--app-border)', padding: '24px 16px 0' }}>
          <div className="app-sidebar-brand">
            <Typography.Text strong style={{ fontSize: 36, lineHeight: 0.9, color: 'inherit' }}>КП ИС</Typography.Text>
            <div style={{ marginTop: 8, fontSize: 13, opacity: 0.92 }}>Коммунальное предприятие</div>
          </div>
          <Menu
            className="app-menu"
            theme="light"
            mode="inline"
            selectedKeys={[location.pathname]}
            style={{ fontSize: 14, borderInlineEnd: 'none', background: 'transparent' }}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
          />
          <div style={{ marginTop: 'auto', borderTop: '1px solid #EEF2F7', paddingTop: 12, color: '#8A94A6' }}>
            <Typography.Text type="secondary">◀ Свернуть</Typography.Text>
          </div>
        </Sider>
        <Layout className="app-page">
          <Header className="app-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <Space direction="vertical" size={1} style={{ minWidth: 0, flex: 1 }}>
              <Typography.Text strong style={{ fontSize: 24, lineHeight: 1.2 }}>
                ИС коммунального предприятия
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12, whiteSpace: 'normal', lineHeight: 1.4 }}>
                Единая панель для абонентов, операторов и администраторов
              </Typography.Text>
            </Space>
            <Space style={{ flexShrink: 0 }}>
              <Input placeholder="Поиск..." prefix={<SearchOutlined />} className="app-search" />
              <Popover
                trigger="click"
                placement="bottomRight"
                content={(
                  <div style={{ width: 300 }}>
                    <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Typography.Text strong>Уведомления</Typography.Text>
                      {notifications.unreadCount > 0 ? <Button type="link" size="small" onClick={notifications.markAllAsRead}>Отметить все как прочитанные</Button> : null}
                    </Space>
                    {notifications.items.length ? notifications.items.map((item) => (
                      <Button
                        key={item.id}
                        type="text"
                        style={{ width: '100%', textAlign: 'left', height: 'auto', padding: 8 }}
                        onClick={() => {
                          notifications.markAsRead(item.id);
                          if (item.link) navigate(item.link);
                        }}
                      >
                        <Space direction="vertical" size={0}>
                          <Typography.Text strong>{item.title}</Typography.Text>
                          <Typography.Text type="secondary">{item.description}</Typography.Text>
                        </Space>
                      </Button>
                    )) : (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                          <Space direction="vertical" size={0}>
                            <Typography.Text strong>Нет новых уведомлений</Typography.Text>
                            <Typography.Text type="secondary">Здесь появятся системные события и важные сообщения.</Typography.Text>
                          </Space>
                        }
                      />
                    )}
                  </div>
                )}
              >
                <Button aria-label="Уведомления" className="icon-button" shape="circle" icon={notifications.unreadCount > 0 ? <Badge count={notifications.unreadCount} size="small"><BellOutlined /></Badge> : <BellOutlined />} />
              </Popover>
              <Dropdown
                trigger={['click']}
                menu={{
                  items: [
                    { key: 'profile', icon: <UserOutlined />, label: 'Профиль', onClick: () => navigate('/profile') },
                    { key: 'settings', icon: <SettingOutlined />, label: 'Настройки аккаунта', onClick: () => navigate('/settings') },
                    { key: 'help', icon: <QuestionCircleOutlined />, label: 'Справка' },
                    { type: 'divider' },
                    { key: 'logout', icon: <LogoutOutlined />, danger: true, label: 'Выход', onClick: handleLogout },
                  ],
                }}
              >
                <Button type="text" className="user-menu-trigger">
                  <Avatar className="user-avatar">{userInitials}</Avatar>
                  <Typography.Text className="user-name">{auth?.user.fullName || auth?.user.email}</Typography.Text>
                  <DownOutlined className="user-chevron" />
                </Button>
              </Dropdown>
            </Space>
          </Header>
          <Content className="app-content">
            <Outlet />
          </Content>
          <Footer className="app-footer app-footer--diploma" style={{ padding: '0 24px' }}>
            <Typography.Text type="secondary">Дипломная работа. БИА22-02, Гуров Станислав Вячеславович, 2026</Typography.Text>
          </Footer>
        </Layout>
      </Layout>
    </Layout>
    </ConfigProvider>
  );
}
