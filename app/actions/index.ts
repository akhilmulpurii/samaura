// Auth actions
export {
  setServerUrl,
  getServerUrl,
  checkServerHealth,
  authenticateUser,
  logout,
  getUser,
  isAuthenticated,
} from "./auth";

// Media actions
export {
  fetchMovies,
  fetchTVShows,
  fetchMediaDetails,
  fetchPersonDetails,
  fetchPersonFilmography,
  fetchResumeItems,
  reportPlaybackStart,
  reportPlaybackProgress,
  reportPlaybackStopped,
  fetchLibraryItems,
  fetchLiveTVItems,
  fetchSimilarItems,
  scanLibrary,
  fetchMovieByCollection,
} from "./media";

// TV show actions
export {
  fetchSeasons,
  fetchEpisodes,
  fetchTVShowDetails,
  fetchEpisodeDetails,
} from "./tv-shows";

// Search actions
export { searchItems, searchPeople } from "./search";

// Utility actions
export {
  getImageUrl,
  getUserImageUrl,
  getDownloadUrl,
  getStreamUrl,
  getSubtitleTracks,
  getUserLibraries,
  getLibraryById,
  fetchRemoteImages,
  downloadRemoteImage,
  fetchCurrentImages,
  reorderBackdropImage,
  deleteImage,
  getUserWithPolicy,
} from "./utils";

// Types
export type {
  RemoteImage,
  RemoteImagesResponse,
  CurrentImage,
  UserPolicy,
  UserWithPolicy,
} from "./utils";
