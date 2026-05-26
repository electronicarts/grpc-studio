// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

export interface Cache<K, V> {
  readonly size: number;
  get(key: K): V | undefined;
  set(key: K, value: V): void;
  delete(key: K): boolean;
  clear(): void;
}
