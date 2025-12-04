import Dexie from 'dexie';

export const db = new Dexie('PhotoAlbumDB');
db.version(1).stores({
  albums: '++id, name, &order', // Primary key 'id', 'name' is indexed, 'order' is unique and indexed
  photos: '++id, albumId, date, name, type, size, data', // Primary key 'id', 'albumId' is indexed
});