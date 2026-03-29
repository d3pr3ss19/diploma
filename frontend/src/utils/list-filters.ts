import type { ServiceRequest } from '../types/requests';
import type { Subscriber } from '../types/subscribers';

export type SubscriberSort = 'newest' | 'oldest' | 'nameAsc' | 'nameDesc';
export type RequestSort = 'newest' | 'oldest' | 'categoryAsc' | 'categoryDesc';
export type RequestStatusFilter = 'ALL' | 'NEW' | 'IN_PROGRESS' | 'DONE' | 'REJECTED';

export function filterSubscribers(items: Subscriber[], search: string): Subscriber[] {
  const normalized = search.trim().toLowerCase();

  if (!normalized) {
    return items;
  }

  return items.filter((item) =>
    [item.fullName, item.address, item.phone ?? ''].join(' ').toLowerCase().includes(normalized),
  );
}

export function sortSubscribers(items: Subscriber[], sort: SubscriberSort): Subscriber[] {
  const sorted = [...items];

  sorted.sort((a, b) => {
    switch (sort) {
      case 'oldest':
        return Date.parse(a.createdAt) - Date.parse(b.createdAt);
      case 'nameAsc':
        return a.fullName.localeCompare(b.fullName, 'ru');
      case 'nameDesc':
        return b.fullName.localeCompare(a.fullName, 'ru');
      case 'newest':
      default:
        return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    }
  });

  return sorted;
}

export function filterRequests(items: ServiceRequest[], search: string, statusFilter: RequestStatusFilter): ServiceRequest[] {
  const normalized = search.trim().toLowerCase();

  return items.filter((item) => {
    const matchStatus = statusFilter === 'ALL' ? true : item.status === statusFilter;
    const matchText = normalized
      ? [item.title, item.description, item.category, item.status].join(' ').toLowerCase().includes(normalized)
      : true;

    return matchStatus && matchText;
  });
}

export function sortRequests(items: ServiceRequest[], sort: RequestSort): ServiceRequest[] {
  const sorted = [...items];

  sorted.sort((a, b) => {
    if (sort === 'oldest') return Date.parse(a.createdAt) - Date.parse(b.createdAt);
    if (sort === 'categoryAsc') return a.category.localeCompare(b.category, 'ru');
    if (sort === 'categoryDesc') return b.category.localeCompare(a.category, 'ru');
    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });

  return sorted;
}

export function paginate<T>(items: T[], currentPage: number, pageSize: number): T[] {
  const start = (currentPage - 1) * pageSize;
  return items.slice(start, start + pageSize);
}
