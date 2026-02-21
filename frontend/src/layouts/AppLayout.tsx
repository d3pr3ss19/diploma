import { HomeOutlined, TeamOutlined, ToolOutlined } from '@ant-design/icons';
import { Layout, Menu, Typography } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/dashboard', icon: <HomeOutlined />, label: 'Панель' },
  { key: '/subscribers', icon: <TeamOutlined />, label: 'Абоненты' },
  { key: '/requests', icon: <ToolOutlined />, label: 'Заявки' },
];

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

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
        <Header style={{ background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
          <Typography.Title level={5} style={{ margin: 0 }}>
            Веб-ориентированная ИС коммунального предприятия
          </Typography.Title>
        </Header>
        <Content style={{ padding: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
