// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { Response } from 'express';

export function isResponseFinished(res: Response): boolean {
  return res.headersSent || res.writableEnded || res.destroyed;
}
