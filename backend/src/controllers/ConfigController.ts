// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { Request, Response } from 'express'
import configManager from '#src/config/configManager.js'
import { sendSuccess } from '#src/utils/responseHelpers.js'
import type { ConfigResponse } from '@grpc-studio/shared'

export async function getConfig(_req: Request, res: Response) {
  const responseBody: ConfigResponse = { config: configManager.getPublicConfig() }
  sendSuccess(res, responseBody)
}
