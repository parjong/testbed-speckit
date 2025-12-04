import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../../../src/services/db';

// Mock Dexie.js's delete and open methods for JSDOM environment
vi.mock('dexie', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    default: class MockDexie extends actual.default {
      constructor(databaseName) {
        super(databaseName);
        this.albums = { data: [] }; // Initialize data arrays
        this.photos = { data: [] }; // Initialize data arrays
        this.on = {
          ready: {
            subscribe: vi.fn(),
          },
        };
        this.version = vi.fn(() => this);
        this.stores = vi.fn(() => this);
        this.open = vi.fn(async () => {
          // Simulate opening the database
          this.albums = {
            add: vi.fn(async (album) => {
              album.id = (this.albums.data.length > 0 ? Math.max(...this.albums.data.map(a => a.id)) : 0) + 1;
              this.albums.data.push(album);
              return album.id;
            }),
            get: vi.fn(async (id) => this.albums.data.find(a => a.id === id)),
            toArray: vi.fn(async () => this.albums.data.sort((a, b) => a.order - b.order)),
            orderBy: vi.fn((key) => ({
              toArray: vi.fn(async () => {
                return this.albums.data.sort((a, b) => {
                  if (a[key] < b[key]) return -1;
                  if (a[key] > b[key]) return 1;
                  return 0;
                });
              }),
            })),
            update: vi.fn(async (id, changes) => {
              const index = this.albums.data.findIndex(a => a.id === id);
              if (index !== -1) {
                this.albums.data[index] = { ...this.albums.data[index], ...changes };
              } else {
                // If album not found, simulate adding it if it has an ID
                if (id) {
                  this.albums.data.push({ id, ...changes });
                }
              }
            }),
            data: [], // In-memory store for albums
          };
          this.photos = {
            add: vi.fn(async (photo) => {
              photo.id = (this.photos.data.length > 0 ? Math.max(...this.photos.data.map(p => p.id)) : 0) + 1;
              this.photos.data.push(photo);
              return photo.id;
            }),
            get: vi.fn(async (id) => this.photos.data.find(p => p.id === id)),
            where: vi.fn((criteria) => ({
              toArray: vi.fn(async () => this.photos.data.filter(p => p.albumId === criteria.albumId)),
            })),
            delete: vi.fn(async (id) => {
              this.photos.data = this.photos.data.filter(p => p.id !== id);
            }),
            data: [], // In-memory store for photos
          };
        });
        this.delete = vi.fn(async () => {
          this.albums.data = [];
          this.photos.data = [];
        });
        this.transaction = vi.fn((mode, tables, callback) => {
          return callback();
        });
      }
    },
  };
});

describe('IndexedDB Setup with Dexie.js', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('should create albums and photos tables', async () => {
    expect(db.albums).toBeDefined();
    expect(db.photos).toBeDefined();
  });

  it('should add an album', async () => {
    const albumId = await db.albums.add({ name: 'Test Album', order: 0 });
    expect(albumId).toBeDefined();
    const album = await db.albums.get(albumId);
    expect(album.name).toBe('Test Album');
  });

  it('should add a photo', async () => {
    const albumId = await db.albums.add({ name: 'Test Album', order: 0 });
    const photoId = await db.photos.add({
      albumId: albumId,
      date: new Date().toISOString(),
      name: 'test.jpg',
      type: 'image/jpeg',
      size: 1024,
      data: new ArrayBuffer(1024),
    });
    expect(photoId).toBeDefined();
    const photo = await db.photos.get(photoId);
    expect(photo.name).toBe('test.jpg');
  });
});