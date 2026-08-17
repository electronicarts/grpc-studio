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
  const philosophersStone = {
    id: 'book-001',
    title: "Harry Potter and the Philosopher's Stone",
    genre: 'GENRE_FANTASY',
    author: 'J.K. Rowling',
    availability: 'AVAILABILITY_IN_STOCK',
    publisher: {
      id: 'pub-001',
      name: 'Bloomsbury Publishing',
      email: 'contact@example.com',
      phone: '+44-555-0101',
      address: {
        street: '50 Bedford Square',
        city: 'London',
        state: '',
        zip_code: 'WC1B 3DP',
        country: 'UK',
        coordinates: { latitude: 51.5194, longitude: -0.127 },
      },
      founded_at: timestamp('1986-09-01T10:30:00Z'),
    },
    page_count: 223,
    weight_kg: 0.42,
    is_hardcover: true,
    cover_thumbnail: Buffer.from('R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==', 'base64'),
    created_at: timestamp('2024-03-01T08:00:00Z'),
    updated_at: now(),
    synopsis: { value: 'An orphan discovers he is a wizard and begins his first year at Hogwarts' },
    edition_number: { value: 1 },
    catalog_entry: { isbn_13: '978-0747532699' },
    alternate_titles: ["Harry Potter and the Sorcerer's Stone"],
    reviews: [
      {
        reviewer: 'Sarah Chen',
        rating: 5,
        comment: 'The book that got a whole generation reading',
        posted_at: timestamp('2024-06-15T09:00:00Z'),
        verified_purchase: { value: true },
      },
      {
        reviewer: 'James Park',
        rating: 4,
        comment: 'Charming, though it is really a setup for the later books',
        posted_at: timestamp('2024-06-18T09:30:00Z'),
        verified_purchase: { value: true },
      },
    ],
    editions: [
      {
        id: 'ed-001',
        format: 'Hardcover',
        language: 'en',
        published_at: timestamp('1997-06-26T00:00:00Z'),
        time_in_print: { seconds: 851472000, nanos: 0 }, // ~27 years
        price_usd: { value: 24.99 },
        signed_copy: false,
      },
    ],
    tags: {
      series: 'Harry Potter',
      award: 'Smarties',
      theme: 'magic',
      'reading-level': 'middle-grade',
    },
    editions_by_format: {
      'Hardcover': {
        id: 'ed-001',
        format: 'Hardcover',
        language: 'en',
        published_at: timestamp('1997-06-26T00:00:00Z'),
        time_in_print: { seconds: 0, nanos: 0 },
        price_usd: { value: 24.99 },
        signed_copy: false,
      },
    },
    metadata: {
      fields: {
        list_price: { numberValue: 24.99 },
        shelf_section: { stringValue: "Children's Fantasy" },
        awards: {
          listValue: {
            values: [
              { stringValue: 'Nestlé Smarties Book Prize' },
              { stringValue: 'British Book Award' },
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

  // -------------------------------------------------------------------------
  // Self-referencing relatives (Book → Book)
  //
  // Attached after construction so the seed literals stay readable. The
  // Philosopher's Stone gets a prequel, sequels and a lineage chain, which
  // makes plain GetBook / ListBooks responses contain a Book nested inside a
  // Book — the shape that trips up renderers walking a cyclic schema.
  // -------------------------------------------------------------------------

  const fantasticBeasts = {
    id: 'book-001-prequel',
    title: 'Fantastic Beasts and Where to Find Them',
    genre: 'GENRE_FANTASY',
    author: 'Newt Scamander',
    availability: 'AVAILABILITY_IN_STOCK',
    publisher: philosophersStone.publisher,
    page_count: 128,
    weight_kg: 0.19,
    is_hardcover: true,
    created_at: timestamp('2001-03-12T08:00:00Z'),
    updated_at: now(),
    synopsis: { value: 'The Hogwarts textbook on magical creatures, written decades before Harry arrived' },
    catalog_entry: { isbn_13: '978-1408803011' },
    alternate_titles: ['Hogwarts Library: Fantastic Beasts'],
    tags: { series: 'Hogwarts Library', position: 'prequel' },
  };

  const chamberOfSecrets = {
    id: 'book-001-sequel-001',
    title: 'Harry Potter and the Chamber of Secrets',
    genre: 'GENRE_FANTASY',
    author: 'J.K. Rowling',
    availability: 'AVAILABILITY_IN_STOCK',
    publisher: philosophersStone.publisher,
    page_count: 251,
    weight_kg: 0.45,
    is_hardcover: false,
    created_at: timestamp('1998-07-02T08:00:00Z'),
    updated_at: now(),
    synopsis: { value: 'A hidden chamber opens and students are petrified in Harry\'s second year' },
    catalog_entry: { series: { series_name: 'Harry Potter', volume: 2, is_final_volume: false } },
    tags: { series: 'Harry Potter', position: 'sequel' },
    // Third level of nesting: Philosopher's Stone → Chamber of Secrets → Azkaban
    sequels: [
      {
        id: 'book-001-sequel-001-a',
        title: 'Harry Potter and the Prisoner of Azkaban',
        genre: 'GENRE_FANTASY',
        author: 'J.K. Rowling',
        availability: 'AVAILABILITY_IN_STOCK',
        page_count: 317,
        weight_kg: 0.52,
        created_at: timestamp('1999-07-08T08:00:00Z'),
        updated_at: now(),
        catalog_entry: { series: { series_name: 'Harry Potter', volume: 3, is_final_volume: false } },
      },
    ],
  };

  const gobletOfFire = {
    id: 'book-001-sequel-002',
    title: 'Harry Potter and the Goblet of Fire',
    genre: 'GENRE_FANTASY',
    author: 'J.K. Rowling',
    availability: 'AVAILABILITY_OUT_OF_STOCK',
    page_count: 636,
    weight_kg: 0.94,
    is_hardcover: false,
    created_at: timestamp('2000-07-08T08:00:00Z'),
    updated_at: now(),
    catalog_entry: { series: { series_name: 'Harry Potter', volume: 4, is_final_volume: false } },
    tags: { series: 'Harry Potter', position: 'sequel' },
  };

  // Direct self-reference
  philosophersStone.prequel = fantasticBeasts;
  // Repeated self-reference
  philosophersStone.sequels = [chamberOfSecrets, gobletOfFire];
  // Indirect self-reference: Book → BookLineage → Book, with a recursive branch
  philosophersStone.lineage = {
    catalog_id: 'CAT-HP-001',
    generation: 1,
    predecessor: fantasticBeasts,
    branches: [
      {
        catalog_id: 'CAT-HP-001-A',
        generation: 2,
        predecessor: chamberOfSecrets,
        branches: [
          {
            catalog_id: 'CAT-HP-001-A-1',
            generation: 3,
            branches: [],
          },
        ],
      },
    ],
  };

  // The Hobbit carries only the indirect cycle, so the two shapes can be compared.
  hobbit.lineage = {
    catalog_id: 'CAT-HOBBIT-002',
    generation: 1,
    branches: [],
  };

  // Related volumes are reachable through the Philosopher's Stone
  // self-referencing fields only — they are deliberately not top-level
  // entries, so ListBooks stays at 3 records.
  books.set(philosophersStone.id, philosophersStone);
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
