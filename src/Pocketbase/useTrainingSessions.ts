import { pb } from '../Pocketbase/pocketbase.ts'

export function useTrainingSessions() {
  // Writes go exclusively through the authenticated training recorder endpoints.
  const fetchMySessions = async (page = 1) => {
    if (!pb.authStore.isValid || !pb.authStore.record)
      throw new Error('Sign in to view training history')
    return await pb.collection('studentRecords').getList(page, 50, {
      filter: pb.filter('student = {:student}', { student: pb.authStore.record.id }),
      sort: '-start_time,-id',
    })
  }

  return { fetchMySessions }
}
