











export const bunnyConfig = {
  storageZone: process.env.BUNNY_STORAGE_ZONE,
  accessKey: process.env.BUNNY_ACCESS_KEY,
  baseUrl: process.env.BUNNY_BASE_URL,
  cdnUrl: process.env.BUNNY_CDN_URL,
  region: process.env.BUNNY_REGION,

  // New configuration for Bunny Stream
  streamLibraryId: process.env.BUNNY_STREAM_LIBRARY_ID, // Add this to your .env
  streamApiKey: process.env.BUNNY_STREAM_API_KEY,
  streamCollectionId: process.env.BUNNY_STREAM_COLLECTION_ID,
  streamHostname: process.env.BUNNY_STREAM_HOSTNAME,
};