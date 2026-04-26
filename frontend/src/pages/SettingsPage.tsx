import { Card, Col, Divider, Row, Slider, Space, Switch, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import { applyAccessibilityPrefs, readAccessibilityPrefs, writeAccessibilityPrefs } from '../app/accessibility';
import { readTheme, writeTheme } from '../app/theme';

export function SettingsPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>(readTheme());
  const [prefs, setPrefs] = useState(readAccessibilityPrefs());

  const canSpeech = useMemo(() => 'speechSynthesis' in window, []);

  useEffect(() => {
    writeTheme(theme);
  }, [theme]);

  useEffect(() => {
    applyAccessibilityPrefs(prefs);
    writeAccessibilityPrefs(prefs);
  }, [prefs]);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Title level={3} style={{ margin: 0 }}>Настройки</Typography.Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Тема интерфейса">
            <Space style={{ justifyContent: 'space-between', width: '100%' }}>
              <Typography.Text>Тёмный режим</Typography.Text>
              <Switch aria-label="Тёмный режим" checked={theme === 'dark'} onChange={(checked) => setTheme(checked ? 'dark' : 'light')} />
            </Space>
            <Divider style={{ margin: '12px 0' }} />
            <Typography.Text type="secondary">
              Включите тёмный режим для комфортной работы в вечернее время.
            </Typography.Text>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Контраст и движение">
            <Space direction="vertical" style={{ width: '100%' }} size={14}>
              <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                <Typography.Text>Высокий контраст</Typography.Text>
                <Switch aria-label="Высокий контраст" checked={prefs.highContrast} onChange={(checked) => setPrefs((prev) => ({ ...prev, highContrast: checked }))} />
              </Space>
              <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                <Typography.Text>Уменьшение анимаций</Typography.Text>
                <Switch aria-label="Уменьшение анимаций" checked={prefs.reducedMotion} onChange={(checked) => setPrefs((prev) => ({ ...prev, reducedMotion: checked }))} />
              </Space>
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Масштаб интерфейса">
            <Space direction="vertical" style={{ width: '100%' }} size={10}>
              <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                <Typography.Text>Экранная лупа</Typography.Text>
                <Switch aria-label="Экранная лупа" checked={prefs.magnifierEnabled} onChange={(checked) => setPrefs((prev) => ({ ...prev, magnifierEnabled: checked }))} />
              </Space>
              <Slider
                min={100}
                max={200}
                step={5}
                disabled={!prefs.magnifierEnabled}
                value={Math.round(prefs.magnifierScale * 100)}
                onChange={(value) => setPrefs((prev) => ({ ...prev, magnifierScale: Number(value) / 100 }))}
              />
              <Typography.Text type="secondary">
                Текущий масштаб: {Math.round(prefs.magnifierScale * 100)}%
              </Typography.Text>
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Озвучка интерфейса">
            <Space style={{ justifyContent: 'space-between', width: '100%' }}>
              <Typography.Text>Озвучка при наведении</Typography.Text>
              <Switch
                aria-label="Озвучка при наведении"
                disabled={!canSpeech}
                checked={prefs.speechOnHover}
                onChange={(checked) => setPrefs((prev) => ({ ...prev, speechOnHover: checked }))}
              />
            </Space>
            <Divider style={{ margin: '12px 0' }} />
            <Typography.Text type="secondary">
              {canSpeech
                ? 'Подсказки будут озвучиваться при наведении на элементы интерфейса.'
                : 'Браузер не поддерживает Web Speech API, озвучка недоступна.'}
            </Typography.Text>
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
