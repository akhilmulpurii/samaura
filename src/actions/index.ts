// Auth actions
export {
  setServerUrl,
  getServerUrl,
  checkServerHealth,
  authenticateUser,
  isQuickConnectEnabled,
  initiateQuickConnect,
  getQuickConnectStatus,
  authenticateWithQuickConnect,
  logout,
  getUser,
  changeUserPassword,
  authorizeQuickConnectCode,
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
  fetchMovieByCollection,
  fetchSeasons,
  fetchEpisodes,
  fetchTVShowDetails,
  fetchEpisodeDetails,
  scanLibrary,
  markFavorite,
  unmarkFavorite,
  fetchVirtualFolders,
  removeVirtualFolder,
  renameVirtualFolder,
  getNextEpisodeForSeries,
} from "./media";

// Search actions
export { searchItems, searchPeople } from "./search";

// Utility actions
export {
  getAuthData,
  getImageUrl,
  getUserImageUrl,
  uploadUserImage,
  getDownloadUrl,
  getStreamUrl,
  getDirectStreamUrl,
  getThemeSongStreamUrl,
  getThemeVideoStreamUrl,
  getSubtitleTracks,
  getAudioTracks,
  getUserLibraries,
  getLibraryById,
  getLiveTVStreamUrl,
  fetchRemoteImages,
  downloadRemoteImage,
  fetchCurrentImages,
  reorderBackdropImage,
  deleteImage,
  getUserById,
  getUserWithPolicy,
  fetchScheduledTasks,
  fetchJellyfinLogs,
  fetchSystemInfo,
  restartServer,
  shutdownServer,
  canBrowserDirectPlayHevc,
  fetchUsers,
  updateUser,
  updateUserPolicy,
  fetchMediaFolders,
  fetchDevices,
  fetchParentalRatings,
  fetchCultures,
  fetchCountries,
  createUser,
  deleteUser,
} from "./utils";
export {
  fetchDashboardGeneralData,
  updateDashboardConfiguration,
} from "./dashboard-general";
export {
  fetchSystemConfiguration,
  fetchMetadataConfiguration,
  updateSystemConfiguration,
  updateMetadataConfiguration,
  fetchXbmcMetadataConfiguration,
  updateXbmcMetadataConfiguration,
  fetchEncodingConfiguration,
  updateEncodingConfiguration,
} from "./configuration";
export {
  fetchDefaultDirectoryBrowser,
  fetchDrives,
  fetchDirectoryContents,
  fetchParentPath,
} from "./file-browser";
export {
  fetchApiKeys,
  normalizeApiKeys,
  createApiKey,
  revokeApiKey,
} from "./api-keys";
export {
  fetchScheduledTasksList,
  startScheduledTask,
  stopScheduledTask,
  updateTaskTriggers,
} from "./scheduled-tasks";
export { fetchActivityLogEntries } from "./activity-log";
export {
  getInstalledSubtitles,
  uploadSubtitleToJellyfin,
  deleteJellyfinSubtitle,
} from "./subtitles-search";
export type {
  InstalledSubtitle,
  UploadSubtitleInput,
} from "./subtitles-search";

// Types
export type {
  RemoteImage,
  RemoteImagesResponse,
  CurrentImage,
  UserWithPolicy,
} from "./utils";
export { testSeerrConnection } from "./seerr";
export type { QuickConnectResult } from "./auth";
