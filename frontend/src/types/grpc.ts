// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

// Protobuf descriptor types — all schema work is done directly with these.


// ApiMethod / ApiService / ApiServer are the HTTP wire format and serve as the canonical
// frontend types too — no separate GrpcMethod / GrpcService needed.
export type { ApiMethod as GrpcMethod, ApiService as GrpcService, ApiServer } from '@grpc-studio/shared'

