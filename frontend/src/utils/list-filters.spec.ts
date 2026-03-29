import { describe, expect, it } from 'vitest';
import { filterRequests, filterSubscribers, paginate, sortRequests, sortSubscribers } from './list-filters';

describe('list-filters utils', () => {
  it('filters subscribers by search text', () => {
    const items = [
      { fullName: 'Иванов Иван', address: 'ул. Мира', phone: '+380501112233' },
      { fullName: 'Петров Петр', address: 'ул. Шевченко', phone: '+380671112233' },
    ];

    const result = filterSubscribers(items as never, 'шевч');
    expect(result).toHaveLength(1);
    expect(result[0]?.fullName).toBe('Петров Петр');
  });

  it('filters requests by status and text', () => {
    const items = [
      { title: 'Нет воды', description: 'Холодной воды нет', category: 'QUESTION', status: 'NEW', createdAt: '2026-01-01' },
      {
        title: 'Авария трубы',
        description: 'Подтопление подвала',
        category: 'ACCIDENT',
        status: 'IN_PROGRESS',
        createdAt: '2026-01-02',
      },
    ];

    const result = filterRequests(items as never, 'авар', 'IN_PROGRESS');
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe('Авария трубы');
  });

  it('sorts and paginates predictably', () => {
    const items = [
      { fullName: 'Б', createdAt: '2026-01-02' },
      { fullName: 'А', createdAt: '2026-01-01' },
      { fullName: 'В', createdAt: '2026-01-03' },
    ];

    const sorted = sortSubscribers(items as never, 'nameAsc');
    expect(sorted.map((item) => item.fullName)).toEqual(['А', 'Б', 'В']);

    const page = paginate(sorted, 2, 2);
    expect(page).toHaveLength(1);
    expect(page[0]?.fullName).toBe('В');
  });

  it('sorts requests by newest first', () => {
    const items = [
      { title: '1', createdAt: '2026-01-01' },
      { title: '2', createdAt: '2026-01-03' },
    ];

    const sorted = sortRequests(items as never, 'newest');
    expect(sorted[0]?.title).toBe('2');
  });
});
