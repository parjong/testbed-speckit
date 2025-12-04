import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../../../src/services/db';
import { PhotoService, AlbumService } from '../../../src/services/photo-service';

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
        this.transaction = vi.fn((mode, tables, callback) => { // Mock transaction
          return callback();
        });
      }
    },
  };
});

describe('PhotoService', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('should add a photo', async () => {
    const albumId = await db.albums.add({ name: 'Test Album', order: 0 });
    const photo = {
      albumId: albumId,
      date: new Date().toISOString(),
      name: 'test.jpg',
      type: 'image/jpeg',
      size: 1024,
      data: new ArrayBuffer(1024),
    };
    const photoId = await PhotoService.addPhoto(photo);
    expect(photoId).toBeDefined();
    const storedPhoto = await db.photos.get(photoId);
    expect(storedPhoto.name).toBe('test.jpg');
  });

  it('should get photos by album', async () => {
    const albumId1 = await db.albums.add({ name: 'Album 1', order: 0 });
    const albumId2 = await db.albums.add({ name: 'Album 2', order: 1 });

    await PhotoService.addPhoto({ albumId: albumId1, name: 'photo1.jpg', date: new Date().toISOString(), type: 'image/jpeg', size: 1, data: new ArrayBuffer(1) });
    await PhotoService.addPhoto({ albumId: albumId1, name: 'photo2.jpg', date: new Date().toISOString(), type: 'image/jpeg', size: 1, data: new ArrayBuffer(1) });
    await PhotoService.addPhoto({ albumId: albumId2, name: 'photo3.jpg', date: new Date().toISOString(), type: 'image/jpeg', size: 1, data: new ArrayBuffer(1) });

    const photosInAlbum1 = await PhotoService.getPhotosByAlbum(albumId1);
    expect(photosInAlbum1.length).toBe(2);
    expect(photosInAlbum1[0].name).toBe('photo1.jpg');
    expect(photosInAlbum1[1].name).toBe('photo2.jpg');
  });

  it('should delete a photo', async () => {
    const albumId = await db.albums.add({ name: 'Test Album', order: 0 });
    const photoId = await PhotoService.addPhoto({ albumId: albumId, name: 'photoToDelete.jpg', date: new Date().toISOString(), type: 'image/jpeg', size: 1, data: new ArrayBuffer(1) });
    await PhotoService.deletePhoto(photoId);
    const photo = await db.photos.get(photoId);
    expect(photo).toBeUndefined();
  });
});

describe('AlbumService', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('should add an album', async () => {
    const album = { name: 'New Album', order: 0 };
    const albumId = await AlbumService.addAlbum(album);
    expect(albumId).toBeDefined();
    const storedAlbum = await db.albums.get(albumId);
    expect(storedAlbum.name).toBe('New Album');
  });

  it('should get all albums in order', async () => {
    await AlbumService.addAlbum({ name: 'Album C', order: 2 });
    await AlbumService.addAlbum({ name: 'Album A', order: 0 });
    await AlbumService.addAlbum({ name: 'Album B', order: 1 });

    const albums = await AlbumService.getAllAlbums();
    expect(albums.length).toBe(3);
    expect(albums[0].name).toBe('Album A');
    expect(albums[1].name).toBe('Album B');
    expect(albums[2].name).toBe('Album C');
  });

  it('should update album order', async () => {
    const albumIdA = await AlbumService.addAlbum({ name: 'Album A', order: 0 });
    const albumIdB = await AlbumService.addAlbum({ name: 'Album B', order: 1 });

    const updatedAlbums = [
      { id: albumIdB, order: 0 },
      { id: albumIdA, order: 1 },
    ];
    await AlbumService.updateAlbumOrder(updatedAlbums);

    const albums = await AlbumService.getAllAlbums();
    expect(albums[0].name).toBe('Album B');
    expect(albums[1].name).toBe('Album A');
  });
});