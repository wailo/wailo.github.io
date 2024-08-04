<template>
  <div class="w-full border grid grid-flow-row grid-cols-1">
    <input
      v-model="displayname"
      placeholder="Enter your display name (optional)"
    />

    <div class="border">
      <input
        v-model="myPeerId"
        :readonly="online"
        placeholder="Enter room id"
      />
      <button
        id="connect"
        variant="default"
        block
        @click="createAnJoinPeer(myPeerId)"
      >
        Start
      </button>
    </div>
    <div class="border">
      <vue-qr
        :text="myPeerId ? `${baseUrl}/#sim?roomId=${myPeerId}` : ''"
        :size="100"
        :margin="0"
        logoBackgroundColor="rgba(0,0,0,0)"
        backgroundColor="rgba(0,0,0,0)"
      ></vue-qr>
    </div>
    <div class="border">
      <b :v-if="myPeerId && myPeerId.length"
        >{{ myPeerId ? `${baseUrl}/#sim?roomId=${myPeerId}` : "" }}
      </b>
    </div>
    <div class="grid grid-flow-row grid-cols-1">
      <div v-for="connection in incomingConns" :key="connection.peer">
        {{ connection.metadata.displayName }}
      </div>
    </div>
    <div class="border">
      <textarea
        id="data-channel-send"
        :readonly="!Object.keys(incomingConns).length"
        placeholder="Press Start, enter some text, then press Send."
        variant="success"
        @input="(event) => send(event?.target?.value)"
      ></textarea>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import * as PeerJS from "peerjs";
import { DataConnection } from "peerjs";

import vueQr from "vue-qr/src/packages/vue-qr.vue";

// Define the event emitter
const emit = defineEmits<{
  (event: "statusChanged", newValue: boolean): void;
  (event: "dataEvent", receivedData: Object): void;
  (event: "error", errorMessage: string): void;
}>();

const name = "WebRTC";
const isDevelopment = true; // env.NODE_ENV === "development";
const baseUrl = window.location.origin;
const server = ""; // process.server;
let myPeer: PeerJS.Peer;
const myPeerId = ref<string>("randomTestUIKD");
let displayname = ref<string>();
let online = ref(false);
let outgoingConn: PeerJS.DataConnection;
type ConnectionsList = { [peerId: string]: PeerJS.DataConnection };
const incomingConns = ref<ConnectionsList>({});
const routeHash = window.location.href;

// Watch the booleanVariable and emit an event when it changes
watch(online, (newValue: boolean) => {
  emit("statusChanged", newValue);
});

onMounted(() => {
  const match = /roomId=(.*)/g.exec(routeHash);
  if (match && match[1]) {
    const roomId = match[1];
    if (roomId) {
      createAnJoinPeer(roomId);
    }
  }
});

const setupConnection = (conn: DataConnection) => {
  // Connection request from remote peer
  trace(`Received a connection data from ${conn.peer}`);
  // Connected to remote peer.
  conn.on("open", () => {
    trace(`OPEN Peer ${conn.peer}`);
    // Done this way due to limitation in Vue2 reactivity with objects
    incomingConns.value[conn.peer] = conn;
  });

  // Data from remote peer
  conn.on("data", (data) => {
    onData(data, conn);
  });

  // Lost connection with remote peer
  conn.on("close", () => onConnectionClose(conn.peer));

  // Error
  conn.on("error", (e: PeerJS.PeerError<string>) =>
    onError(`${e.type} - ${e.name} - ${e.message} - ${e.stack}`),
  );
};

const onDisconnected = (peer: PeerJS.Peer) => {
  trace(`Peer disconnected ${peer.id}`);
  delete incomingConns.value[peer.id];
};

const onPeerClose = (peerId: string) => {
  trace(`Peer closed ${peerId}`);
  online.value = false;
};

const onConnectionClose = (peerId: string) => {
  trace(`Connection closed ${peerId}`);

  // If we close the connection, we are not online anymore.
  // Not sure if this state ever get triggerred.
  if (peerId === myPeerId.value) {
    online.value = false;
  }
  delete incomingConns.value[peerId];
};

const onData = (data, conn: PeerJS.DataConnection) => {
  trace(`Received ${data} from ${conn.peer}`);
  emit("dataEvent", { conn, data });
};

const onError = (err: string) => {
  trace(`Error: ${err}`);
  emit("error", err);
};

const createAnJoinPeer = (targetPeerId: string) => {
  if (myPeer?.id === targetPeerId) {
    return;
    // return new Promise((resolve) => resolve(myPeer));
  }

  // Auto genrate display name
  displayname.value =
    displayname.value || Math.random().toString(36).substr(2, 5).toUpperCase();

  // const hostConfig: PeerJS.PeerOptions = {};
  // if (isDevelopment) {
  //   hostConfig.host = "localhost";
  //   hostConfig.port = 9000;
  //   hostConfig.path = "/myapp";
  // }

  // Create a new peer
  const peer = new PeerJS.Peer(targetPeerId);

  // Peer receive a connection request from the server
  // let conn: PeerJS.DataConnection;
  peer.on("connection", (newConn: PeerJS.DataConnection) => {
    // conn = newConn;
    setupConnection(newConn);
  });

  // Peer is disconnected from the server, but can recover
  peer.on("disconnected", () => onDisconnected(peer));
  // Peer (me) is destroyed and can't connect to the server
  peer.on("close", () => onPeerClose(peer.id));
  // Wrapped in promise to allow async call waiting until connection is esablish
  // return new Promise((resolve, reject) => {
  // Connected to the peerServer
  peer.on("open", (id: string) => {
    trace("OPEN: My peer ID is: " + id);
    myPeer = peer;
    online.value = true;
    if (id != myPeerId.value) {
      connectToPeer(myPeerId.value);
      myPeerId.value = id;
    }
  });
  // Error
  peer.on("error", (e: PeerJS.PeerError<string>) => {
    onError(`${e.type} - ${e.name} - ${e.message} - ${e.stack}`);
    if (e.type === "unavailable-id") {
      // if id is taken, it means someone gave us the class-id and we want to join the class.
      // A peer will be created with a random ID.
      createAnJoinPeer("");
    }
  });
  // });
};
const connectToPeer = async (remotePeerId: string) => {
  // If no peer created, create a new peer
  // if (!myPeer) {
  //   console.log("creating a new pear");
  //   createPeer(remotePeerId.trim())
  //   return;
  // }

  trace(`Connecting to a peer ${remotePeerId}`);
  const conn = myPeer.connect(remotePeerId, {
    metadata: { displayName: displayname.value },
  });

  // conn.on('disconnected', this.onDisconnected)
  conn.on("error", (e) =>
    onError(`${e.type} - ${e.name} - ${e.message} - ${e.stack}`),
  );
  conn.on("close", () => onConnectionClose(conn.peer));

  conn.on("open", () => {
    trace(`OPEN Connected to a peer ${remotePeerId}`);
    outgoingConn = conn;

    // Data received from remote peer
    conn.on("data", (data) => {
      onData(data, conn);
    });
  });
};

const send = (data) => {
  // Send data to all peers
  Object.entries(incomingConns.value).forEach(([, conn]) => {
    trace(`Sending data to ${conn.peer}:  ${data}`);
    conn.send(data);
  });
};

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
