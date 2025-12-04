import { describe, it, expect, beforeEach, vi } from 'vitest'; // Added vi
import { JSDOM } from 'jsdom';
import { db } from '../../src/services/db';
import { PhotoService, AlbumService } from '../../src/services/photo-service';
import { getAlbumNameFromDate } from '../../src/utils/date-grouping';
// import { main } from '../../src/main'; // Removed this import

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


describe('Photo Upload and Album Creation Integration', () => {
  let dom;
  let container;

  beforeEach(async () => {
    dom = new JSDOM('<!DOCTYPE html><body><div id="app"></div></body>');
    global.document = dom.window.document;
    global.window = dom.window;

    // Mock DataTransfer
    global.window.DataTransfer = class DataTransfer {
      constructor() {
        this.files = [];
        this.items = { // Mock DataTransferItemList
          _items: [],
          add: function(file) {
            this._items.push(file);
            // When an item is added to items, it should also be reflected in files
            // This is a simplified representation. Real DataTransfer can be more complex.
            if (!this.files.includes(file)) {
              this.files.push(file);
            }
          }.bind(this), // Bind 'this' to the DataTransfer instance
        };
      }
      // In a real DataTransfer, files is a FileList, not directly manipulated like this.
      // For testing purposes, directly assigning to files is often sufficient.
      // However, to match the `items.add` behavior, we'll update files when items are added.
    };

    container = document.getElementById('app');
    container.innerHTML = `
      <h1>Photo Album Organizer</h1>
      <p>Upload photos to create and organize albums.</p>
      <input type="file" id="photo-upload" multiple />
      <div id="albums-container"></div>
    `;

    // Clear and open the actual DB for isolation
    await db.delete();
    await db.open();

    // Import main.js AFTER the DOM is set up
    await import('../../src/main');
  });

  it('should process uploaded photos and create albums', async () => {
    // Mock a File object
    const mockFile = (name, dateString) => {
      const file = new File(['dummy content'], name, { type: 'image/jpeg' });
      Object.defineProperty(file, 'lastModifiedDate', { value: new Date(dateString) });
      return file;
    };

    const file1 = mockFile('photo1.jpg', '2023-01-15T10:00:00Z');
    const file2 = mockFile('photo2.jpg', '2023-01-15T11:00:00Z');
    const file3 = mockFile('photo3.jpg', '2023-02-20T12:00:00Z');

    const dataTransfer = new dom.window.DataTransfer();
    dataTransfer.items.add(file1);
    dataTransfer.items.add(file2);
    dataTransfer.items.add(file3);

    const inputElement = document.getElementById('photo-upload');
    inputElement.files = dataTransfer.files;

    // Manually trigger the change event
    const event = new dom.window.Event('change', { bubbles: true });
    inputElement.dispatchEvent(event);

    // Give some time for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    const albums = await AlbumService.getAllAlbums();
    expect(albums.length).toBe(2); // Expect two albums: Jan 15, 2023 and Feb 20, 2023

    const album1 = albums.find(a => a.name === getAlbumNameFromDate('2023-01-15T10:00:00Z'));
    const album2 = albums.find(a => a.name === getAlbumNameFromDate('2023-02-20T12:00:00Z'));

    expect(album1).toBeDefined();
    expect(album2).toBeDefined();

    const photosInAlbum1 = await PhotoService.getPhotosByAlbum(album1.id);
    expect(photosInAlbum1.length).toBe(2);
    expect(photosInAlbum1.some(p => p.name === 'photo1.jpg')).toBe(true);
    expect(photosInAlbum1.some(p => p.name === 'photo2.jpg')).toBe(true);

    const photosInAlbum2 = await PhotoService.getPhotosByAlbum(album2.id);
    expect(photosInAlbum2.length).toBe(1);
    expect(photosInAlbum2.some(p => p.name === 'photo3.jpg')).toBe(true);
  });
});