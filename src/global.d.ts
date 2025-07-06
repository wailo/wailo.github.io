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
type PeerCheckPointData = { checkpoint: string };
type PeerScriptData = {tite:string, script: string}
type PeerData = (PeerApiData | PeerStatusData | PeerScriptData | PeerCheckPointData);
