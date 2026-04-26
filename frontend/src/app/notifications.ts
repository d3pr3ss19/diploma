import { useMemo, useState } from 'react';

export type NotificationItem = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  unread: boolean;
  link?: string;
};

const initialNotifications: NotificationItem[] = [];

export function useNotifications() {
  const [items, setItems] = useState<NotificationItem[]>(initialNotifications);

  const unreadCount = useMemo(() => items.filter((item) => item.unread).length, [items]);

  function markAllAsRead() {
    setItems((prev) => prev.map((item) => ({ ...item, unread: false })));
  }

  function markAsRead(id: string) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, unread: false } : item)));
  }

  return { items, unreadCount, markAllAsRead, markAsRead };
}
