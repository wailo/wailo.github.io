interface Window {
    flag: boolean;
    cache: number[];
  MonacoEnvironment: {
    getWorker: (moduleId: string, label: string) => Worker;
  };
}

// Define a type for the data structure 
type PeerApiData = { api: string,  };
type PeerStatusData = { status: string };
type PeerData = (PeerApiData | PeerStatusData);