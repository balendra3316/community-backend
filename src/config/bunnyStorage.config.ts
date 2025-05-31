
// export const bunnyConfig = {
//   storageZone: 'lms-acd', // Your storage zone name
//   accessKey: 'a701dbbe-400e-4055-97f17219ddc2-fda1-4531', // This IS your access key (storage zone password)
//   baseUrl: 'https://sg.storage.bunnycdn.com', // Singapore region endpoint
//   cdnUrl: 'https://lms-anyonecandance.b-cdn.net', // Your CDN URL
//   region: 'sg' 
// };




export const bunnyConfig = {
  storageZone: process.env.BUNNY_STORAGE_ZONE,
  accessKey: process.env.BUNNY_ACCESS_KEY,
  baseUrl: process.env.BUNNY_BASE_URL,
  cdnUrl: process.env.BUNNY_CDN_URL,
  region: process.env.BUNNY_REGION
};