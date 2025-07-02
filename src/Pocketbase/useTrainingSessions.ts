import {pb} from '../Pocketbase/pocketbase.ts'

type Metric = {
  timestamp: number
  altitude: number
  speed: number
  turnRate: number
}

type SessionInput = {

  scenario: string
  start_time: Date
  end_time: Date
  raw_metrics: Metric[]
  score?: number
}

export function useTrainingSessions() {
  const submitSession = async (data: SessionInput) => {
    try {
      let recordServices = await pb.collection('studentRecords');
      const result = await recordServices.create({
        ...data,
        student: pb.authStore.record?.id,
      });
      return result;
    } catch (error) {
      console.log('Failed to submit session:', error);
      throw error;
    }
  }

  const fetchMySessions = async () => {
    return await pb.collection('studentRecords').getFullList({
      filter: `student = "${pb.authStore.model?.id}"`,
      sort: '-created',
    })
  }

  return { submitSession, fetchMySessions }
}
