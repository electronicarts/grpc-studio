// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { Router } from 'express';
import { metricsEndpoint } from '../controllers/MetricsController.js';

const router = Router();

router.get('/', metricsEndpoint);

export default router;
