import PocketBase from 'pocketbase'
// || 'http://localhost:8090'
export const pb = new PocketBase(import.meta.env.VITE_PB_URL || 'https://raspberrypi.tail89a8a0.ts.net/pb' )

// // Persist auth across sessions
// pb.authStore.onChange(() => {
//   localStorage.setItem('pb_auth', JSON.stringify(pb.authStore.export()))
// })
