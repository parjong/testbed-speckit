import { AlbumService } from '../services/photo-service';

export class AlbumList {
  constructor(container) {
    this.container = container;
    this.albums = [];
  }

  async render() {
    this.albums = await AlbumService.getAllAlbums();
    this.container.innerHTML = ''; // Clear existing content

    if (this.albums.length === 0) {
      this.container.innerHTML = '<p>No albums found.</p>';
      return;
    }

    this.albums.forEach(album => {
      const albumDiv = document.createElement('div');
      albumDiv.className = 'album-item';
      albumDiv.dataset.id = album.id;
      albumDiv.innerHTML = `<h3>${album.name}</h3>`;
      this.container.appendChild(albumDiv);
    });
  }
}