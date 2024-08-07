<template>
  <div class="w-full border grid grid-flow-row grid-cols-1">
    <div class="w-full border grid grid-flow-row grid-cols-1">
      <input
        v-model="myPeerId"
        :readonly="isOnline"
        placeholder="Classroom name (optional)"
        class="text-secondary bg-primary w-full border border-simElementBorder"
      />
      <input
        v-model="displayname"
        placeholder="Enter your display name (optional)"
        class="text-secondary bg-primary w-full border border-simElementBorder"
      />
      <!-- <button-switch
        id="share"
        button-label="Share"
        class="border border-simElementBorder"
        :buttonClick="() => (isQrPopupOpen = true)"
      >
      </button-switch> -->

      <button-switch
        id="connect"
        :button-label="isOnline ? 'Disconnect' : 'Start'"
        class="border border-simElementBorder"
        :buttonClick="
          () => (isOnline ? disconnect() : createAnJoinPeer(myPeerId))
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
            class="size-4"
          >
            <path
              d="M12 6a2 2 0 1 0-1.994-1.842L5.323 6.5a2 2 0 1 0 0 3l4.683 2.342a2 2 0 1 0 .67-1.342L5.995 8.158a2.03 2.03 0 0 0 0-.316L10.677 5.5c.353.311.816.5 1.323.5Z"
            />
          </svg>
        </button>
      </button-switch>
    </div>

    <!-- <textarea
      id="data-channel-send"
      :readonly="!Object.keys(incomingConns).length"
      placeholder="Press Start, enter some text, then press Send."
      variant="success"
      @input="(event) => send(event?.target?.value)"
    ></textarea> -->

    <div class="grid grid-flow-row grid-cols-1">
      <h3>Peers</h3>
      <table class="table-fixed text-left border">
        <thead class="border-b border-t border-black bg-panelHeaderBackground">
          <tr>
            <th class="w-3/5">Callsign</th>
            <th class="w-1/5">Status</th>
            <th class="w-1/5">Disconnect</th>
          </tr>
        </thead>
        <tbody>
          <tr
            class="nowrap border-b"
            v-for="connection in incomingConns"
            :key="connection.peer"
          >
            <!-- Display name -->
            <td class="pl-1">{{ connection.metadata.displayName }}</td>
            <!-- Status -->
            <td class="pl-1 border-l border-simElementBorder">
              <button class="">
                <svg
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
                </svg>
              </button>
            </td>
            <!-- Disconnect -->
            <td class="pl-1 border-l border-simElementBorder">
              <button @click="connection.close()">
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
      <button-switch button-label="Follow Mode" :button-state="followMode"  :button-click="() => followMode = !followMode"/>
    </div>

    <div
      v-if="isQrPopupOpen == true"
      class="fixed inset-0 flex items-center justify-center bg-simBackground bg-opacity-50"
      @click.self="() => (isQrPopupOpen = false)"
    >
      <div class="bg-simBackground p-6 rounded-lg shadow-lg w-min text-center">
        <vue-qr
          :text="myPeerId ? `${baseUrl}/#sim?roomId=${myPeerId}` : ''"
          :size="150"
          :margin="0"
          backgroundColor="rgba(0,0,0,0)"
        ></vue-qr>

        <div class="border">
          <b :v-if="myPeerId && myPeerId.length"
            >{{ myPeerId ? `${baseUrl}/#sim?roomId=${myPeerId}` : "" }}
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import ButtonSwitch from "./ButtonSwitch.vue";
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
const myPeerId = ref<string>("EK583838");
let displayname = ref<string>();
let isOnline = ref(false);
let outgoingConn: PeerJS.DataConnection;
type ConnectionsList = { [peerId: string]: PeerJS.DataConnection };
const incomingConns = ref<ConnectionsList>({
  "332-ddd-23": { metadata: { displayName: "John Smith" } },
});
const routeHash = window.location.href;
const isQrPopupOpen = ref(false);
const followMode = ref(false);

// Watch the booleanVariable and emit an event when it changes
watch(isOnline, (newValue: boolean) => {
  emit("statusChanged", newValue);
});

const copyToClipboard = () => {
  const textToCopy = `${baseUrl}/#sim?roomId=${myPeerId}`;
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
  createAnJoinPeer(myPeerId.value);
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
  isOnline.value = false;
};

const onConnectionClose = (peerId: string) => {
  trace(`Connection closed ${peerId}`);

  // If we close the connection, we are not online anymore.
  // Not sure if this state ever get triggerred.
  if (peerId === myPeerId.value) {
    isOnline.value = false;
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
  trace(`Creating a new peer ${targetPeerId}`);
  if (myPeer?.id === targetPeerId) {
    return;
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
    isOnline.value = true;
    // If the user entered a peer id
    if (myPeerId.value.length && id != myPeerId.value) {
      connectToPeer(myPeerId.value);
    }
    myPeerId.value = id;
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
};

const disconnect = () => {
  trace("Disconnect");
  myPeer.disconnect();
  isOnline.value = false;
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
