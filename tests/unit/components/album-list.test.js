import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

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

import { AlbumList } from '../../../src/components/album-list';
import { AlbumService } from '../../../src/services/photo-service';
import { db } from '../../../src/services/db';

// Mock AlbumService
vi.mock('../../../src/services/photo-service', () => ({
  AlbumService: {
    getAllAlbums: vi.fn(),
    updateAlbumOrder: vi.fn(),
  },
}));

describe('AlbumList Component', () => {
  let dom;
  let container;

  beforeEach(async () => {
    dom = new JSDOM('<!DOCTYPE html><body><div id="app"></div></body>');
    global.document = dom.window.document;
    global.window = dom.window;
    container = document.getElementById('app');

    // Clear and open the actual DB for isolation
    await db.delete();
    await db.open();

    // Reset mocks
    AlbumService.getAllAlbums.mockReset();
    AlbumService.updateAlbumOrder.mockReset();
  });

  it('should render a list of albums', async () => {
    const mockAlbums = [
      { id: 1, name: 'Album A', order: 0 },
      { id: 2, name: 'Album B', order: 1 },
    ];
    AlbumService.getAllAlbums.mockResolvedValue(mockAlbums);

    const albumList = new AlbumList(container);
    await albumList.render();

    expect(AlbumService.getAllAlbums).toHaveBeenCalled();
    expect(container.querySelectorAll('.album-item').length).toBe(2);
    expect(container.querySelector('.album-item h3').textContent).toBe('Album A');
  });

  it('should display a message if no albums are found', async () => {
    AlbumService.getAllAlbums.mockResolvedValue([]);

    const albumList = new AlbumList(container);
    await albumList.render();

    expect(AlbumService.getAllAlbums).toHaveBeenCalled();
    expect(container.textContent).toContain('No albums found.');
  });

  // More tests for drag-and-drop functionality will be added in Phase 5
});