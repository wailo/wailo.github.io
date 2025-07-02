<template>
  <div class="w-full max-h-full grid grid-flow-row grid-cols-1 gap-2">
    <div class="w-full grid grid-flow-row grid-cols-1 gap-1">
      <input
        v-model="selfPeerId"
        :readonly="isOnline"
        placeholder="Classroom name (optional)"
        class="pl-1 text-secondary bg-primary w-full border border-simElementBorder"
      />
      <input
        v-model="displayname"
        placeholder="Enter your display name (optional)"
        class="pl-1 text-secondary bg-primary w-full border border-simElementBorder"
      />
      <!-- <button-switch
        id="share"
        button-label="Share"
        class="border border-simElementBorder"
        :buttonClick="() => (isQrPopupOpen = true)"
      >
      </button-switch> -->

      <wButton
        id="connect"
        :button-label="isOnline ? 'Disconnect' : 'Start'"
        :button-state="isOnline"
        class="border border-simElementBorder"
        :buttonClick="
          () => (isOnline ? disconnect() : createAnJoinPeer(selfPeerId))
        "
      >
        <button
          :disabled="!isOnline"
          button-label=""
          class="border border-simElementBorder"
          @click="() => (isQrPopupOpen = true)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            class="size-3"
          >
            <path
              d="M12 6a2 2 0 1 0-1.994-1.842L5.323 6.5a2 2 0 1 0 0 3l4.683 2.342a2 2 0 1 0 .67-1.342L5.995 8.158a2.03 2.03 0 0 0 0-.316L10.677 5.5c.353.311.816.5 1.323.5Z"
            />
          </svg>
        </button>
      </wButton>
    </div>

    <div class="grid grid-flow-row grid-cols-1">
      <h3>Peers [{{ Object.keys(incomingConns).length }}]</h3>
      <table class="table-fixed text-left border">
        <thead
          class="border-b border-t border-simElementBorder bg-panelHeaderBackground"
        >
          <tr>
            <th class="w-1/5">Callsign</th>
            <th class="flex-1">Status</th>
            <th class="flex-1">Disconnect</th>
          </tr>
        </thead>
        <tbody>
          <tr
            class="nowrap border-b"
            v-for="(peer, peerId) in incomingConns"
            :key="peerId"
          >
            <!-- Display name -->
            <td class="pl-1">{{ peer.conn.metadata.displayName }}</td>
            <!-- Status -->
            <td class="pl-1 border-l border-simElementBorder">
              <button class="">
                {{ peer.conn.metadata.status}}
                <!-- <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  class="size-4"
                >
                  <path
                    fill-rule="evenodd"
                    d="M3.757 4.5c.18.217.376.42.586.608.153-.61.354-1.175.596-1.678A5.53 5.53 0 0 0 3.757 4.5ZM8 1a6.994 6.994 0 0 0-7 7 7 7 0 1 0 7-7Zm0 1.5c-.476 0-1.091.386-1.633 1.427-.293.564-.531 1.267-.683 2.063A5.48 5.48 0 0 0 8 6.5a5.48 5.48 0 0 0 2.316-.51c-.152-.796-.39-1.499-.683-2.063C9.09 2.886 8.476 2.5 8 2.5Zm3.657 2.608a8.823 8.823 0 0 0-.596-1.678c.444.298.842.659 1.182 1.07-.18.217-.376.42-.586.608Zm-1.166 2.436A6.983 6.983 0 0 1 8 8a6.983 6.983 0 0 1-2.49-.456 10.703 10.703 0 0 0 .202 2.6c.72.231 1.49.356 2.288.356.798 0 1.568-.125 2.29-.356a10.705 10.705 0 0 0 .2-2.6Zm1.433 1.85a12.652 12.652 0 0 0 .018-2.609c.405-.276.78-.594 1.117-.947a5.48 5.48 0 0 1 .44 2.262 7.536 7.536 0 0 1-1.575 1.293Zm-2.172 2.435a9.046 9.046 0 0 1-3.504 0c.039.084.078.166.12.244C6.907 13.114 7.523 13.5 8 13.5s1.091-.386 1.633-1.427c.04-.078.08-.16.12-.244Zm1.31.74a8.5 8.5 0 0 0 .492-1.298c.457-.197.893-.43 1.307-.696a5.526 5.526 0 0 1-1.8 1.995Zm-6.123 0a8.507 8.507 0 0 1-.493-1.298 8.985 8.985 0 0 1-1.307-.696 5.526 5.526 0 0 0 1.8 1.995ZM2.5 8.1c.463.5.993.935 1.575 1.293a12.652 12.652 0 0 1-.018-2.608 7.037 7.037 0 0 1-1.117-.947 5.48 5.48 0 0 0-.44 2.262Z"
                    clip-rule="evenodd"
                  />
                </svg> -->
              </button>
            </td>
            <!-- Disconnect -->
            <td class="pl-1 border-l border-simElementBorder">
              <button @click="peer.conn.close()">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  class="size-4"
                >
                  <path
                    fill-rule="evenodd"
                    d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm2.78-4.22a.75.75 0 0 1-1.06 0L8 9.06l-1.72 1.72a.75.75 0 1 1-1.06-1.06L6.94 8 5.22 6.28a.75.75 0 0 1 1.06-1.06L8 6.94l1.72-1.72a.75.75 0 1 1 1.06 1.06L9.06 8l1.72 1.72a.75.75 0 0 1 0 1.06Z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <wButton
      button-label="Follow Mode"
      :button-state="followMode"
      :button-click="() => (followMode = !followMode)"
    />
  </div>

  <div
    v-if="isQrPopupOpen == true"
    class="fixed inset-0 flex items-center justify-center bg-simBackground bg-opacity-50"
    @click.self="() => (isQrPopupOpen = false)"
  >
    <div class="bg-simBackground p-6 rounded-lg shadow-lg w-min text-center">
      <!-- <vue-qr
        :text="myPeerId ? `${baseUrl}/#sim?roomId=${myPeerId}` : ''"
        :size="150"
        :margin="0"
        backgroundColor="rgba(0,0,0,0)"
      ></vue-qr> -->

      <div class="border">
        <b :v-if="selfPeerId && selfPeerId.length"
          >{{ selfPeerId ? `${baseUrl}/#sim?roomId=${selfPeerId}` : "" }}
        </b>
      </div>

      <button
        @click="copyToClipboard"
        class="mt-4 px-4 py-2 bg-primary text-secondary border border-simElementBorder"
      >
        Copy
      </button>

      <button
        @click="() => (isQrPopupOpen = false)"
        class="mt-4 px-4 py-2 bg-primary text-secondary border border-simElementBorder"
      >
        Close
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import wButton from "./wButton.vue";
import * as PeerJS from "peerjs";
import { DataConnection } from "peerjs";
// import vueQr from "vue-qr/src/packages/vue-qr.vue";

// Define the event emitter
const emit = defineEmits<{
  (event: "statusChanged", newValue: boolean): void;
  (event: "apiDataEvent", receivedData: PeerApiData ): void;
  (event: "error", errorMessage: string): void;
}>();

const isDevelopment = import.meta.env.MODE === "development"; // env.NODE_ENV === "development";
const baseUrl = window.location.origin;
let selfPeer: PeerJS.Peer;
let instructorConnection: PeerJS.DataConnection;
let outConnectionOpen = false;
const selfPeerId = ref<string>(isDevelopment ? "EK583838" : "");
let displayname = ref<string>();
let isOnline = ref(false);
type ConnectionMeta = {
  displayName?: string;
  status?: string;
  [key: string]: any;
};

type ConnectionsList = {
  [peerId: string]: {
    metadata: ConnectionMeta;
    conn: PeerJS.DataConnection;
  };
};
const incomingConns = ref<ConnectionsList>({});
const routeHash = window.location.href;
const isQrPopupOpen = ref(false);
const followMode = ref(false);



// for (let i = 0; i < 10; ++i) {
//   incomingConns.value[i] = {
//     peer: i.toString(),
//     metadata: { displayName: i.toString() },
//   };
// }

// Watch the booleanVariable and emit an event when it changes
watch(isOnline, (newValue: boolean) => {
  emit("statusChanged", newValue);
  followMode.value = true;
});

const copyToClipboard = () => {
  const textToCopy = `${baseUrl}/#sim?roomId=${selfPeerId}`;
  navigator.clipboard
    .writeText(textToCopy)
    .then(() => {
      alert("Copied to clipboard!");
    })
    .catch((err) => {
      console.error("Failed to copy: ", err);
    });
};

onMounted(() => {

  // There is no hook in Vuejs to detect when a tab is closed.
  // When the user closes the tab, disconnect
  window.addEventListener("beforeunload", disconnect);

  const match = /roomId=(.*)/g.exec(routeHash);
  if (match && match[1]) {
    selfPeerId.value = match[1];
    if (selfPeerId.value) {
      createAnJoinPeer(selfPeerId.value);
    }
  }

});

const setupConnection = (incomingConnection: DataConnection) => {
  // Connection request from remote peer
  trace(`Received a connection data from ${incomingConnection.peer}`);

   // Data from remote peer
   incomingConnection.on("data", (data: unknown) => {
    onData(data as PeerApiData, incomingConnection);
  });
  // Connected to remote peer.
  incomingConnection.on("open", () => {
    trace(`OPEN Peer ${incomingConnection.peer}`);

    // Add to incoming connection list (create new entry)
    incomingConns.value[incomingConnection.peer] = {
      metadata: incomingConnection.metadata || {},
      conn: incomingConnection,
    };
  });



  // Lost connection with remote peer
  incomingConnection.on("close", () => onConnectionClose(incomingConnection.peer));

  // Error
  incomingConnection.on("error", (e: PeerJS.PeerError<string>) => {
    onError(`${e.type} - ${e.name} - ${e.message} - ${e.stack}`);
    incomingConnection.close()

    if (e.type === "unavailable-id") {
      // if id is taken, it means someone gave us the class-id and we want to join the class.
      // A peer will be created with a random ID.
      createAnJoinPeer("");
    }
});
};

const onDisconnected = (peer: PeerJS.Peer) => {
  trace(`Peer disconnected ${peer.id}`);
  delete incomingConns.value[peer.id];
};

const onPeerClose = (peerId: string) => {
  trace(`Peer closed ${peerId}`);
  isOnline.value = false;
};

const onConnectionClose = (peerId: string) => {
  trace(`Connection closed ${peerId}`);

  // If we close the connection, we are not online anymore.
  // Not sure if this state ever get triggerred.
  if (peerId === selfPeerId.value) {
    isOnline.value = false;
  }
  delete incomingConns.value[peerId];
};

const onData = (data: PeerData, conn: PeerJS.DataConnection) => {
  trace(`Received ${JSON.stringify(data)} from ${conn.peer}`);
  if (data.api) {
    emit("apiDataEvent", data as PeerApiData );
  }
  else if (data.status) {
    // some logic to update the student status.
    incomingConns.value[conn.peer].metadata.status = data.status;
  }
  else {
    emit("error", `Unknown data: ${data}`);
  }
};

const onError = (err: string) => {
  trace(`Error: ${err}`);
  emit("error", err);
};

const createAnJoinPeer = (targetPeerId: string) => {
  trace(`Creating a new peer ${targetPeerId}`);
  if (selfPeer?.id === targetPeerId) {
    return;
  }

  // Auto genrate display name
  displayname.value =
    displayname.value || Math.random().toString(36).substring(2, 7).toUpperCase();

  const hostConfig: PeerJS.PeerOptions = {};
  if (isDevelopment) {
    hostConfig.host = "127.0.0.1";
    hostConfig.port = 9000;
  }
  else {
    hostConfig.host = "raspberrypi.tail89a8a0.ts.net";
    hostConfig.port = 443;
    hostConfig.secure = true ;
    hostConfig.path = "/peerjs";
  }

  // Create a new peer
  const peerJsServer = new PeerJS.Peer(targetPeerId, hostConfig);

  // Peer receive a connection request from the server
  peerJsServer.on("connection", (incomingConnection: PeerJS.DataConnection) => {
    // outConnection = newConn;
    setupConnection(incomingConnection);
  });

  // Peer is disconnected from the server, but can recover
  peerJsServer.on("disconnected", () => onDisconnected(peerJsServer));
  // Peer (me) is destroyed and can't connect to the server
  peerJsServer.on("close", () => onPeerClose(peerJsServer.id));
  // Wrapped in promise to allow async call waiting until connection is esablish
  // return new Promise((resolve, reject) => {
  // Connected to the peerServer
  peerJsServer.on("open", (id: string) => {
    trace("OPEN: My peer ID is: " + id);
    selfPeer = peerJsServer;
    isOnline.value = true;
    // If the user entered a peer id
    if (selfPeerId.value.length && id != selfPeerId.value) {
      connectToPeer(selfPeerId.value);
    }
    selfPeerId.value = id;
  });
  // Error
  peerJsServer.on("error", (e: PeerJS.PeerError<string>) => {
    onError(`${e.type} - ${e.name} - ${e.message} - ${e.stack}`);
    if (e.type === "unavailable-id") {
      // if id is taken, it means someone gave us the class-id and we want to join the class.
      // A peer will be created with a random ID.
      createAnJoinPeer("");
    }
  });
};

const disconnect = () => {
  trace("Disconnect");
  if (instructorConnection) {
    instructorConnection.close();
  }
  if (incomingConns) {
    Object.keys(incomingConns.value).forEach((id) => {
      const conn = incomingConns.value[id].conn;
      conn.close();
    });
  }

  if (selfPeer) {
    selfPeer.disconnect();
  }

  isOnline.value = false;
};

const connectToPeer = async (remotePeerId: string) => {
  trace(`Connecting to a peer ${remotePeerId}`);
  instructorConnection = selfPeer.connect(remotePeerId, {
    metadata: { displayName: displayname.value },
  });

  // conn.on('disconnected', this.onDisconnected)
  instructorConnection.on("error", (e) =>
    onError(`${e.type} - ${e.name} - ${e.message} - ${e.stack}`),
  );
    instructorConnection.on("close", () => {
        outConnectionOpen = false
        onConnectionClose(instructorConnection.peer)
        }
    );

    instructorConnection.on("open", () => {
    outConnectionOpen = true;
    trace(`OPEN Connected to a peer ${remotePeerId}`);
    // Data received from remote peer
    instructorConnection.on("data", (data : unknown) => {
      onData(data, instructorConnection);
    });
  });
};

const send = (data: any) => {
  // Send data to all peers
  Object.entries(incomingConns.value).forEach(([, peer]) => {
    trace(`Sending data to ${peer.conn.peer}:  ${JSON.stringify(data)}`);
    peer.conn.send(data);
  });
};

const sendApiCall = (apiCall: string) => {
  // Must be online and mirror mode activated
  if (!isOnline.value || !followMode.value) {
    return;
  }

  const data = { api: apiCall };
  // Send data to all peers
  send(data);
};


const sendStatus = (status: string) => {
  debugger
    if (!instructorConnection) {
        return;
    }
    console.log("sendStatus", status)

  // Must be online and mirror mode activated
  if (!isOnline.value || !followMode.value || !outConnectionOpen) {
    return;
  }

  const data = { status: status };
  // Send data to all peers
  // send(data);

  instructorConnection.send(data)

};

const reset = () => {
  trace("Resetting classroom");
  disconnect();
  if (selfPeer) {
    selfPeer.destroy();
    selfPeer = undefined as any;
  }
  incomingConns.value = {};
  instructorConnection = undefined as any;
};

defineExpose({ sendApiCall, sendStatus, reset });

const trace = (text: string) => {
  if (isDevelopment === false) {
    return;
  }

  if (text[text.length - 1] === "\n") {
    text = text.substring(0, text.length - 1);
  }
  if (window.performance) {
    const now = (window.performance.now() / 1000).toFixed(3);
    console.log(now + ": " + text);
  } else {
    console.log(text);
  }
};

// peer.on('open')         // Connected to peerServer
// peer.on('connection')   // Recevied a connection request from peerServer
// peer.on('close')        // Peer (me) is destroyed and can't connect to the server
// peer.on('disconnected') // Peer (me) is disconnted but can reconnect to the server
// peer.on('call')

// dataConnection.on('data')  // Data received from remote peer
// dataConnection.on('open')  // Peer to peer connection is established
// dataConnection.on('close') // Peer (me) or remote peer closes the connection
// dataConnection.on('error')

// 'error'
//  'browser-incompatible'
//  'disconnected'
//  'invalid-id'
//  'invalid-key'
//  'network'
//  'peer-unavailable'
//  'ssl-unavailable'
//  'server-error'
//  'socket-error'
//  'socket-closed'
//  'unavailable-id'
//  'webrtc'
</script>

<style scoped></style>
