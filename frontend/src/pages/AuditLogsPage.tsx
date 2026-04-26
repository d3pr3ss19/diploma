import { Alert, Card, List, Segmented, Space, Typography } from 'antd';
import { useEffect, useState } from 'react';

import { AuditLogItem, AuditLogSection, getAuditLogs } from '../api/auth';
import { extractApiErrorMessage } from '../api/error';

const ACTION_LABELS: Record<string, string> = {
  USER_DEACTIVATED: 'Пользователь деактивирован',
  USER_ACTIVATED: 'Пользователь активирован',
  USER_ARCHIVED: 'Пользователь архивирован',
  USER_PASSWORD_RESET: 'Пароль пользователя сброшен',
  USER_ROLE_UPDATED: 'Роль пользователя изменена',
  USER_PROFILE_UPDATED: 'Профиль пользователя обновлён',
  SUBSCRIBER_CREATED: 'Абонент создан',
  SUBSCRIBER_UPDATED: 'Карточка абонента обновлена',
  REQUEST_CREATED: 'Заявка создана',
  REQUEST_UPDATED: 'Заявка обновлена',
};

function getActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? `Действие: ${action}`;
}

export function AuditLogsPage() {
  const [section, setSection] = useState<AuditLogSection>('USERS');
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLogs() {
      try {
        setLoading(true);
        setError(null);
        const data = await getAuditLogs(section);
        setLogs(data);
      } catch (err) {
        setError(extractApiErrorMessage(err, 'Не удалось загрузить аудит-логи.'));
      } finally {
        setLoading(false);
      }
    }

    void loadLogs();
  }, [section]);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card className="page-intro">
        <Typography.Title level={3} style={{ margin: 0 }}>Логи действий</Typography.Title>
        <Typography.Text type="secondary">
          Централизованный аудит по пользователям, абонентам и заявкам.
        </Typography.Text>
      </Card>

      {error ? <Alert type="error" showIcon message={error} /> : null}

      <Card className="app-card-soft">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Segmented
            block
            value={section}
            onChange={(value) => setSection(value as AuditLogSection)}
            options={[
              { label: 'Пользователи', value: 'USERS' },
              { label: 'Абоненты', value: 'SUBSCRIBERS' },
              { label: 'Заявки', value: 'REQUESTS' },
            ]}
          />

          <List
            loading={loading}
            dataSource={logs}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  title={`${getActionLabel(item.action)} · ${new Date(item.createdAt).toLocaleString('ru-RU')}`}
                  description={`Кто: ${item.actorUser?.email ?? 'Система'} → Кому: ${item.targetUser?.email ?? '—'}`}
                />
              </List.Item>
            )}
          />
        </Space>
      </Card>
    </Space>
  );
}
