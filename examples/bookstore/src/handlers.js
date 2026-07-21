// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

'use strict';

const grpc = require('@grpc/grpc-js');
const store = require('./store');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function now() {
  return { seconds: Math.floor(Date.now() / 1000), nanos: 0 };
}

function notFound(call, callback, id) {
  callback({
    code: grpc.status.NOT_FOUND,
    message: `Book "${id}" not found`,
  });
}

// ---------------------------------------------------------------------------
// Unary RPCs
// ---------------------------------------------------------------------------

function CreateBook(call, callback) {
  const book = call.request.book;
  if (!book || !book.title) {
    return callback({
      code: grpc.status.INVALID_ARGUMENT,
      message: 'book.title is required',
    });
  }
  callback(null, store.create(book));
}

function GetBook(call, callback) {
  const book = store.get(call.request.id);
  if (!book) return notFound(call, callback, call.request.id);
  callback(null, book);
}

function UpdateBook(call, callback) {
  const book = call.request.book;
  const updateMask = call.request.update_mask;

  if (!book || !book.id) {
    return callback({
      code: grpc.status.INVALID_ARGUMENT,
      message: 'book.id is required',
    });
  }

  const existing = store.get(book.id);
  if (!existing) return notFound(call, callback, book.id);

  // If a field mask is provided, merge only the listed fields (snake_case paths).
  // Otherwise perform a full replacement.
  let target;
  if (updateMask && updateMask.paths && updateMask.paths.length > 0) {
    target = { ...existing };
    for (const path of updateMask.paths) {
      if (Object.prototype.hasOwnProperty.call(book, path)) {
        target[path] = book[path];
      }
    }
  } else {
    target = book;
  }

  const updated = store.update(target);
  if (!updated) return notFound(call, callback, book.id);
  callback(null, updated);
}

function DeleteBook(call, callback) {
  const deleted = store.remove(call.request.id);
  if (!deleted) return notFound(call, callback, call.request.id);
  callback(null, {});
}

function ListBooks(call, callback) {
  let results = store.list();
  const { genre_filter, availability_filter, page_size, page_token } = call.request;

  if (genre_filter && genre_filter !== 'GENRE_UNSPECIFIED') {
    results = results.filter((b) => b.genre === genre_filter);
  }
  if (availability_filter && availability_filter !== 'AVAILABILITY_UNSPECIFIED') {
    results = results.filter((b) => b.availability === availability_filter);
  }

  const total = results.length;
  const startIndex = page_token ? parseInt(page_token, 10) || 0 : 0;
  const size = page_size > 0 ? page_size : 20;
  const page = results.slice(startIndex, startIndex + size);
  const nextToken = startIndex + size < total ? String(startIndex + size) : '';

  callback(null, {
    books: page,
    next_page_token: nextToken,
    total_count: total,
  });
}

function SearchBooks(call, callback) {
  let results = store.list();
  const { query, genres, max_page_count, max_price_usd } = call.request;

  if (query) {
    const q = query.toLowerCase();
    results = results.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        (b.author && b.author.toLowerCase().includes(q)) ||
        (b.synopsis?.value && b.synopsis.value.toLowerCase().includes(q)),
    );
  }
  if (genres && genres.length > 0) {
    const set = new Set(genres);
    results = results.filter((b) => set.has(b.genre));
  }
  if (max_page_count?.value != null) {
    results = results.filter((b) => b.page_count <= max_page_count.value);
  }
  if (max_price_usd?.value != null) {
    results = results.filter((b) => {
      const price = b.editions?.[0]?.price_usd?.value;
      return price == null || price <= max_price_usd.value;
    });
  }

  callback(null, { books: results, next_page_token: '', total_count: results.length });
}

// ---------------------------------------------------------------------------
// Server streaming — live catalog event feed
// ---------------------------------------------------------------------------

const EVENT_TYPES = ['sale', 'restock', 'review_posted', 'price_change', 'reserved', 'returned', 'featured'];

function WatchBooks(call) {
  const genreFilter = new Set(
    (call.request.genre_filter || []).filter((g) => g !== 'GENRE_UNSPECIFIED'),
  );

  const interval = setInterval(() => {
    const bookId = store.randomBookId();
    if (!bookId) return;

    const book = store.get(bookId);
    if (genreFilter.size > 0 && !genreFilter.has(book.genre)) return;

    const event = {
      book_id: bookId,
      event_type: EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)],
      timestamp: now(),
      details: {
        fields: {
          title: { stringValue: book.title },
          genre: { stringValue: book.genre },
          note: { stringValue: `"${book.title}" is trending!` },
        },
      },
    };

    call.write(event);
  }, 2000);

  call.on('cancelled', () => clearInterval(interval));
  call.on('error', () => clearInterval(interval));
}

// ---------------------------------------------------------------------------
// Client streaming — bulk book creation
// ---------------------------------------------------------------------------

function BulkCreateBooks(call, callback) {
  const ids = [];
  const errors = [];

  call.on('data', (request) => {
    try {
      const book = request.book;
      if (!book || !book.title) {
        errors.push(`Skipped book: title is required`);
        return;
      }
      const created = store.create(book);
      ids.push(created.id);
    } catch (err) {
      errors.push(err.message);
    }
  });

  call.on('end', () => {
    callback(null, {
      created_count: ids.length,
      ids,
      errors,
    });
  });
}

// ---------------------------------------------------------------------------
// Bidirectional streaming — stock checks across warehouses
// ---------------------------------------------------------------------------

const WAREHOUSE_DEFAULTS = ['east', 'west', 'central', 'overseas'];

function CheckStock(call) {
  call.on('data', (request) => {
    const book = store.get(request.book_id);
    if (!book) {
      call.write({
        book_id: request.book_id,
        quantities: {},
        checked_at: now(),
        is_available: false,
      });
      return;
    }

    const warehouses =
      request.warehouses && request.warehouses.length > 0
        ? request.warehouses
        : WAREHOUSE_DEFAULTS;

    const quantities = {};
    let total = 0;
    for (const warehouse of warehouses) {
      const qty = Math.floor(Math.random() * 50);
      quantities[warehouse] = qty;
      total += qty;
    }

    call.write({
      book_id: request.book_id,
      quantities,
      checked_at: now(),
      is_available: total > 0,
    });
  });

  call.on('end', () => call.end());
  call.on('error', () => {});
}

// ---------------------------------------------------------------------------
// Export handler map
// ---------------------------------------------------------------------------

module.exports = {
  CreateBook,
  GetBook,
  UpdateBook,
  DeleteBook,
  ListBooks,
  SearchBooks,
  WatchBooks,
  BulkCreateBooks,
  CheckStock,
};
