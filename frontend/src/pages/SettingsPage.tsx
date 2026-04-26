import { Card, Slider, Space, Switch, Typography } from 'antd';
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

      <Card title="Доступность и интерфейс">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space>
            <Typography.Text>Тёмный режим</Typography.Text>
            <Switch aria-label="Тёмный режим" checked={theme === 'dark'} onChange={(checked) => setTheme(checked ? 'dark' : 'light')} />
          </Space>

          <Space>
            <Typography.Text>Высокий контраст</Typography.Text>
            <Switch aria-label="Высокий контраст" checked={prefs.highContrast} onChange={(checked) => setPrefs((prev) => ({ ...prev, highContrast: checked }))} />
          </Space>

          <Space direction="vertical" style={{ width: 380 }}>
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
          </Space>

          <Space>
            <Typography.Text>Озвучка при наведении</Typography.Text>
            <Switch
              aria-label="Озвучка при наведении"
              disabled={!canSpeech}
              checked={prefs.speechOnHover}
              onChange={(checked) => setPrefs((prev) => ({ ...prev, speechOnHover: checked }))}
            />
          </Space>

          {!canSpeech ? (
            <Typography.Text type="secondary">Браузер не поддерживает Web Speech API, озвучка недоступна.</Typography.Text>
          ) : null}

          <Space>
            <Typography.Text>Уменьшение анимаций</Typography.Text>
            <Switch aria-label="Уменьшение анимаций" checked={prefs.reducedMotion} onChange={(checked) => setPrefs((prev) => ({ ...prev, reducedMotion: checked }))} />
          </Space>
        </Space>
      </Card>
    </Space>
  );
}
