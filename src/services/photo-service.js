import { db } from './db';

export const PhotoService = {
  async addPhoto(photo) {
    return await db.photos.add(photo);
  },

  async getPhotosByAlbum(albumId) {
    return await db.photos.where({ albumId }).toArray();
  },

  async deletePhoto(id) {
    return await db.photos.delete(id);
  },
};

export const AlbumService = {
  async addAlbum(album) {
    return await db.albums.add(album);
  },

  async getAllAlbums() {
    return await db.albums.orderBy('order').toArray();
  },

  async updateAlbumOrder(albums) {
    await db.transaction('rw', db.albums, async () => {
      for (const album of albums) {
        await db.albums.update(album.id, { order: album.order });
      }
    });
  },
};