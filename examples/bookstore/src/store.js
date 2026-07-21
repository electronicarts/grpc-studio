// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

'use strict';

const crypto = require('node:crypto');

// ---------------------------------------------------------------------------
// In-memory book store with seed data
// ---------------------------------------------------------------------------

const books = new Map();

function now() {
  const ts = new Date();
  return { seconds: Math.floor(ts.getTime() / 1000), nanos: 0 };
}

function timestamp(iso) {
  const ts = new Date(iso);
  return { seconds: Math.floor(ts.getTime() / 1000), nanos: 0 };
}

// ---------------------------------------------------------------------------
// Seed data — demonstrates every proto field type
// ---------------------------------------------------------------------------

function seed() {
  const dune = {
    id: 'book-001',
    title: 'Dune',
    genre: 'GENRE_SCIENCE',
    author: 'Frank Herbert',
    availability: 'AVAILABILITY_IN_STOCK',
    publisher: {
      id: 'pub-001',
      name: 'Chilton Books',
      email: 'contact@example.com',
      phone: '+1-555-0101',
      address: {
        street: '401 Walnut Street',
        city: 'Philadelphia',
        state: 'PA',
        zip_code: '19106',
        country: 'US',
        coordinates: { latitude: 39.9496, longitude: -75.1503 },
      },
      founded_at: timestamp('1922-01-15T10:30:00Z'),
    },
    page_count: 412,
    weight_kg: 0.68,
    is_hardcover: true,
    cover_thumbnail: Buffer.from('R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==', 'base64'),
    created_at: timestamp('2024-03-01T08:00:00Z'),
    updated_at: now(),
    synopsis: { value: 'Epic tale of politics, religion, and ecology on the desert planet Arrakis' },
    edition_number: { value: 1 },
    catalog_entry: { isbn_13: '978-0441013593' },
    alternate_titles: ['Dune Chronicles Book 1'],
    reviews: [
      {
        reviewer: 'Sarah Chen',
        rating: 5,
        comment: 'A masterpiece of world-building',
        posted_at: timestamp('2024-06-15T09:00:00Z'),
        verified_purchase: { value: true },
      },
      {
        reviewer: 'James Park',
        rating: 4,
        comment: 'Dense but rewarding',
        posted_at: timestamp('2024-06-18T09:30:00Z'),
        verified_purchase: { value: true },
      },
    ],
    editions: [
      {
        id: 'ed-001',
        format: 'Hardcover',
        language: 'en',
        published_at: timestamp('1965-08-01T00:00:00Z'),
        time_in_print: { seconds: 1861920000, nanos: 0 }, // ~59 years
        price_usd: { value: 29.99 },
        signed_copy: false,
      },
    ],
    tags: {
      series: 'Dune',
      award: 'Hugo',
      theme: 'ecology',
      'reading-level': 'adult',
    },
    editions_by_format: {
      'Hardcover': {
        id: 'ed-001',
        format: 'Hardcover',
        language: 'en',
        published_at: timestamp('1965-08-01T00:00:00Z'),
        time_in_print: { seconds: 0, nanos: 0 },
        price_usd: { value: 29.99 },
        signed_copy: false,
      },
    },
    metadata: {
      fields: {
        list_price: { numberValue: 29.99 },
        shelf_section: { stringValue: 'Science Fiction' },
        awards: {
          listValue: {
            values: [
              { stringValue: 'Hugo Award' },
              { stringValue: 'Nebula Award' },
            ],
          },
        },
      },
    },
  };

  const hobbit = {
    id: 'book-002',
    title: 'The Hobbit',
    genre: 'GENRE_FANTASY',
    author: 'J.R.R. Tolkien',
    availability: 'AVAILABILITY_PREORDER',
    publisher: {
      id: 'pub-002',
      name: 'George Allen & Unwin',
      email: 'info@example.com',
      phone: '+44-555-0202',
      address: {
        street: '40 Museum Street',
        city: 'London',
        state: '',
        zip_code: 'WC1A 1LU',
        country: 'UK',
        coordinates: { latitude: 51.5155, longitude: -0.1256 },
      },
      founded_at: timestamp('1914-11-20T15:00:00Z'),
    },
    page_count: 310,
    weight_kg: 0.45,
    is_hardcover: false,
    cover_thumbnail: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    created_at: timestamp('2024-05-10T12:00:00Z'),
    updated_at: now(),
    synopsis: { value: 'Bilbo Baggins is swept into a quest to reclaim a treasure guarded by a dragon' },
    edition_number: null,
    catalog_entry: { series: { series_name: 'Middle-earth', volume: 1, is_final_volume: false } },
    alternate_titles: ['The Hobbit, or There and Back Again'],
    reviews: [
      {
        reviewer: 'Emma Wilson',
        rating: 5,
        comment: 'Timeless adventure for all ages',
        posted_at: timestamp('2024-05-10T10:00:00Z'),
        verified_purchase: { value: false },
      },
    ],
    editions: [],
    tags: {
      series: 'Middle-earth',
      theme: 'adventure',
      'reading-level': 'all-ages',
    },
    editions_by_format: {},
    metadata: {
      fields: {
        list_price: { numberValue: 14.99 },
        formats_available: {
          listValue: {
            values: [
              { stringValue: 'paperback' },
              { stringValue: 'audiobook' },
            ],
          },
        },
      },
    },
  };

  const goodnight = {
    id: 'book-003',
    title: 'Goodnight Moon',
    genre: 'GENRE_CHILDREN',
    author: 'Margaret Wise Brown',
    availability: 'AVAILABILITY_IN_STOCK',
    publisher: null,
    page_count: 32,
    weight_kg: 0.2,
    is_hardcover: true,
    cover_thumbnail: Buffer.alloc(0),
    created_at: timestamp('2024-08-01T16:00:00Z'),
    updated_at: now(),
    synopsis: { value: 'A soothing bedtime story beloved by generations of young readers' },
    edition_number: null,
    catalog_entry: { internal_sku: 4417 },
    alternate_titles: [],
    reviews: [
      {
        reviewer: 'David Kim',
        rating: 5,
        comment: 'My kids ask for it every night',
        posted_at: timestamp('2024-10-05T11:00:00Z'),
        verified_purchase: { value: true },
      },
    ],
    editions: [],
    tags: {
      theme: 'bedtime',
      'reading-level': 'toddler',
      illustrated: 'yes',
    },
    editions_by_format: {},
    metadata: {
      fields: {
        list_price: { numberValue: 8.99 },
        shelf_section: { stringValue: "Children's" },
      },
    },
  };

  books.set(dune.id, dune);
  books.set(hobbit.id, hobbit);
  books.set(goodnight.id, goodnight);
}

// ---------------------------------------------------------------------------
// Store operations
// ---------------------------------------------------------------------------

function generateId() {
  return `book-${crypto.randomUUID().slice(0, 8)}`;
}

function get(id) {
  return books.get(id) || null;
}

function list() {
  return Array.from(books.values());
}

function create(book) {
  const id = book.id || generateId();
  const record = {
    ...book,
    id,
    created_at: book.created_at || now(),
    updated_at: book.updated_at || now()
  };
  books.set(id, record);
  return record;
}

function update(book) {
  const existing = books.get(book.id);
  if (!existing) return null;
  const record = { ...existing, ...book, updated_at: book.updated_at || now() };
  books.set(book.id, record);
  return record;
}

function remove(id) {
  return books.delete(id);
}

function randomBookId() {
  const ids = Array.from(books.keys());
  return ids[Math.floor(Math.random() * ids.length)] || null;
}

// Initialize seed data
seed();

module.exports = { get, list, create, update, remove, randomBookId, generateId };
