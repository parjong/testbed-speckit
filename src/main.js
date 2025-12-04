import './style.css';
import { PhotoService, AlbumService } from './services/photo-service';
import { getAlbumNameFromDate } from './utils/date-grouping';
import { AlbumList } from './components/album-list'; // Import AlbumList

document.querySelector('#app').innerHTML = `
  <h1>Photo Album Organizer</h1>
  <p>Upload photos to create and organize albums.</p>
  <input type="file" id="photo-upload" multiple accept="image/*" />
  <div id="albums-container"></div>
`;

const photoUploadInput = document.getElementById('photo-upload');
const albumsContainer = document.getElementById('albums-container');
const albumList = new AlbumList(albumsContainer); // Instantiate AlbumList

photoUploadInput.addEventListener('change', async (event) => {
  const files = Array.from(event.target.files);

  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      console.warn(`Skipping non-image file: ${file.name}`);
      continue;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const photoData = e.target.result; // Base64 or ArrayBuffer

      // Extract date from file (lastModifiedDate is a good fallback)
      const date = file.lastModifiedDate || new Date();
      const dateString = date.toISOString();

      const albumName = getAlbumNameFromDate(dateString);

      // Check if album exists, otherwise create it
      let album = (await AlbumService.getAllAlbums()).find(a => a.name === albumName);
      if (!album) {
        const allAlbums = await AlbumService.getAllAlbums();
        const newOrder = allAlbums.length > 0 ? Math.max(...allAlbums.map(a => a.order)) + 1 : 0;
        album = { name: albumName, order: newOrder };
        album.id = await AlbumService.addAlbum(album);
      }

      const photo = {
        albumId: album.id,
        date: dateString,
        name: file.name,
        type: file.type,
        size: file.size,
        data: photoData, // Store the actual image data
      };
      await PhotoService.addPhoto(photo);
      console.log(`Photo ${file.name} added to album ${album.name}`);
      // Re-render albums after new photo is added
      albumList.render(); // Use AlbumList to re-render
    };
    reader.readAsDataURL(file); // Read as Data URL for easier storage and display
  }
});

// Initial render of albums on page load
albumList.render(); // Use AlbumList for initial render