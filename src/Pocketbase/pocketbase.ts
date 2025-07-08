import PocketBase from 'pocketbase'
// || 'http://localhost:8090'
const pocketBaseURL = import.meta.env.DEV ? 'http://localhost:8090' : 'https://raspberrypi.tail89a8a0.ts.net/pb';
export const pb = new PocketBase(import.meta.env.VITE_PB_URL || pocketBaseURL)

// // Persist auth across sessions
// pb.authStore.onChange(() => {
//   localStorage.setItem('pb_auth', JSON.stringify(pb.authStore.export()))
// })
