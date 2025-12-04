export function getAlbumNameFromDate(dateString) {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return 'Undated Photos';
  }
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}