export type SubscribersPreset = 'newest' | 'nameAsc';
export type RequestsPreset = 'open' | 'inProgress';

export function hasActiveQuery(searchParams: URLSearchParams): boolean {
  return searchParams.toString().length > 0;
}

export function buildSubscribersPresetQuery(preset: SubscribersPreset): URLSearchParams {
  const params = new URLSearchParams();
  params.set('sort', preset);
  params.set('page', '1');
  return params;
}

export function buildRequestsPresetQuery(preset: RequestsPreset): URLSearchParams {
  const params = new URLSearchParams();
  params.set('sort', 'newest');
  params.set('page', '1');

  if (preset === 'open') {
    params.set('status', 'NEW');
  }

  if (preset === 'inProgress') {
    params.set('status', 'IN_PROGRESS');
  }

  return params;
}

export function withUpdatedParam(searchParams: URLSearchParams, key: string, value: string): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  if (value) {
    next.set(key, value);
  } else {
    next.delete(key);
  }

  if (key !== 'page') {
    next.set('page', '1');
  }

  return next;
}
