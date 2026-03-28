import { describe, expect, it } from 'vitest';
import {
  buildRequestsPresetQuery,
  buildSubscribersPresetQuery,
  hasActiveQuery,
  withUpdatedParam,
} from './list-query-state';

describe('list-query-state utils', () => {
  it('detects active query params', () => {
    expect(hasActiveQuery(new URLSearchParams())).toBe(false);
    expect(hasActiveQuery(new URLSearchParams('q=test'))).toBe(true);
  });

  it('builds subscribers preset query', () => {
    const params = buildSubscribersPresetQuery('nameAsc');
    expect(params.get('sort')).toBe('nameAsc');
    expect(params.get('page')).toBe('1');
  });

  it('builds requests preset query', () => {
    const open = buildRequestsPresetQuery('open');
    expect(open.get('status')).toBe('NEW');
    expect(open.get('sort')).toBe('newest');

    const inProgress = buildRequestsPresetQuery('inProgress');
    expect(inProgress.get('status')).toBe('IN_PROGRESS');
  });

  it('updates query params and resets page on non-page changes', () => {
    const base = new URLSearchParams('q=abc&page=3');
    const updatedSearch = withUpdatedParam(base, 'q', 'zzz');
    expect(updatedSearch.get('q')).toBe('zzz');
    expect(updatedSearch.get('page')).toBe('1');

    const updatedPage = withUpdatedParam(updatedSearch, 'page', '5');
    expect(updatedPage.get('page')).toBe('5');
  });
});
