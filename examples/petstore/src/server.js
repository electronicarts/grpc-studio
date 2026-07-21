// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const descriptor = require('protobufjs/ext/descriptor');
const { ReflectionService } = require('@grpc/reflection');
const handlers = require('./handlers');

// ---------------------------------------------------------------------------
// Load proto
// ---------------------------------------------------------------------------

const PROTO_PATH = path.join(__dirname, '..', 'proto', 'petstore.proto');
const DESCRIPTOR_PATH = path.join(__dirname, '..', 'proto', 'petstore_descriptor.bin');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const proto = grpc.loadPackageDefinition(packageDefinition);
const PetStoreService = proto.petstore.v1.PetStoreService.service;

// ---------------------------------------------------------------------------
// Build a PackageDefinition-like object from the protoc descriptor set.
// proto-loader merges files and loses original import names, so grpc-studio
// can't resolve "google/protobuf/timestamp.proto". The protoc-generated
// descriptor preserves the real file names and dependency graph.
// ---------------------------------------------------------------------------

function loadDescriptorAsPackageDefinition(descriptorPath) {
  const buf = fs.readFileSync(descriptorPath);
  const ds = descriptor.FileDescriptorSet.decode(buf);
  const allBins = ds.file.map((f) =>
    descriptor.FileDescriptorProto.encode(f).finish(),
  );
  // ReflectionService iterates Object.values(pkg) looking for
  // { fileDescriptorProtos: Buffer[] }. A single entry carrying all
  // encoded file descriptors is sufficient.
  return { _: { fileDescriptorProtos: allBins } };
}

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------

const PORT = process.env.PORT || '50051';

const server = new grpc.Server();

// Register PetStore handlers
server.addService(PetStoreService, handlers);

// Enable server reflection with proper file descriptors
const reflectionPkg = loadDescriptorAsPackageDefinition(DESCRIPTOR_PATH);
const reflection = new ReflectionService(reflectionPkg);
reflection.addToServer(server);

// Start
server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
  if (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
  console.log(`PetStore gRPC server listening on port ${port}`);
  console.log(`Reflection enabled — connect gRPC Studio to localhost:${port}`);
});
