<template>
  <div>
    <b-row>
      <b-col sm="3">
        <b-button block disabled variant="default"
          >Display name</b-button
        ></b-col
      >
      <b-col sm="9">
        <b-form-input
          v-model="displayname"
          placeholder="Enter your display name (optional)"
          >{{ displayname }}</b-form-input
        ></b-col
      >
    </b-row>
    <b-row>
      <b-col sm="3">
        <b-button
          ref="btn-create-room"
          variant="default"
          block
          @click="createPeer(peerId)"
          >Create room
        </b-button></b-col
      >
      <b-col sm="9">
        <b-form-input
          v-model="peerId"
          :readonly="online"
          placeholder="Enter room name (optional)"
          >{{ peerId }}</b-form-input
        >
      </b-col>
    </b-row>
    <b-row>
      <b-col sm="3">
        <b-button
          id="connect"
          variant="default"
          block
          @click="connectToPeer(remotePeerId)"
          >Join room
        </b-button>
      </b-col>

      <b-col sm="9">
        <b-form-input
          v-model="remotePeerId"
          placeholder="Enter room id"
        ></b-form-input>
      </b-col>
    </b-row>
    <b-row>
      <b-col sm="5">
        <b-card bg-variant="transparent" border-variant="dark" header="Peers">
          <b-list-group>
            <b-list-group-item
              v-for="connection in incomingConns"
              :key="connection.peer"
              variant="success"
              button
              >{{ connection.metadata.displayName }}</b-list-group-item
            >
          </b-list-group>

          <!-- <p class="card-text mt-2">
        Quis magna Lorem anim amet ipsum do mollit sit cillum voluptate ex nulla
        tempor. Laborum consequat non elit enim exercitation cillum aliqua
        consequat id aliqua. Esse ex consectetur mollit voluptate est in duis
        laboris ad sit ipsum anim Lorem.
      </p> -->
        </b-card>
      </b-col>
      <b-col sm="7">
        <b-textarea
          id="data-channel-send"
          :readonly="!Object.keys(incomingConns).length"
          placeholder="Press Start, enter some text, then press Send."
          variant="success"
          @input="send"
        ></b-textarea>
        <b-textarea
          ref="data-channel-receive"
          variant="success"
          readonly
        ></b-textarea>
      </b-col>
    </b-row>
  </div>
</template>

<script>
import Peer from 'peerjs'

export default {
  name: 'WebRTC',
  props: {},
  emits: ['dataEvent', 'error'],
  data() {
    return {
      isDevelopment: process.env.NODE_ENV === 'development',
      peer: null,
      peerId: null,
      displayname: null,
      online: false,
      remotePeerId: null,
      outgoingConn: null,
      incomingConns: {},
    }
  },
  mounted() {},
  methods: {
    onConnection(conn) {
      // Connection request from remote peer
      this.trace(`Received a connection data from ${conn.peer}`)

      // Connected to remote peer.
      conn.on('open', () => {
        this.trace(`OPEN Peer ${conn.peer}`)
        // Done this way due to limitation in Vue2 reactivity with objects
        this.$set(this.incomingConns, conn.peer, conn)
      })

      // Data from remote peer
      conn.on('data', (data) => {
        this.onData(data, this)
      })

      // Lost connection with remote peer
      conn.on('close', () => this.onClose(conn))
      // Error
      conn.on('error', this.onError)
    },
    onDisconnected(peer) {
      this.trace(`Peer disconnected ${peer.id}`)
      this.$delete(this.incomingConns, peer.id)
    },
    onClose(conn) {
      this.trace(`Peer closed ${conn.peer}`)
      this.$delete(this.incomingConns, conn.peer)
    },
    onData(data, conn) {
      this.trace(`Received ${data} from ${conn.peer}`)
      this.$refs['data-channel-receive'].value = data
      this.$emit('dataEvent', { conn, data })
    },
    onError(err) {
      this.trace(`${err} - ${err.type}`)
      // if (err.type === 'unavailable-id') {
      //   // if the user name is taken.
      //   // notify the user...
      // }

      this.$emit('error', err)
    },
    createPeer(peerId) {
      this.displayname =
        this.displayname ||
        Math.random().toString(36).substr(2, 5).toUpperCase()

      const hostConfig = this.isDevelopment
        ? {
            host: 'localhost',
            port: 9000,
            path: '/myapp',
          }
        : null

      this.peer = new Peer(peerId, hostConfig)

      // Peer receive a connection request from the server
      this.peer.on('connection', this.onConnection)
      // Peer is disconnected from the server, but can recover
      this.peer.on('disconnected', () => this.onDisconnected(this.peer))
      // Peer (me) is destroyed and can't connect to the server
      this.peer.on('close', this.onClose)
      // Wrapped in promise to allow async call waiting until connection is esablish
      return new Promise((resolve, reject) => {
        // Connected to the peerServer
        this.peer.on('open', (id) => {
          this.trace('OPEN: My peer ID is: ' + id)
          this.peerId = id
          this.online = true
          resolve()
        })
        // Error
        this.peer.on('error', (e) => {
          this.onError(e)
          reject(e)
        })
      })
    },
    async connectToPeer(id) {
      if (!id || !id.trim()) {
        this.onError({ message: 'Invalid room name' })
        return
      }
      if (!this.peer) {
        await this.createPeer()
      }
      const vm = this

      this.trace(`Connecting to a peer ${id}`)
      const conn = vm.peer.connect(id, {
        metadata: { displayName: vm.displayname },
      })

      // conn.on('disconnected', this.onDisconnected)
      conn.on('error', this.onError)
      conn.on('close', () => this.onClose(conn))

      conn.on('open', () => {
        vm.trace(`OPEN Connected to a peer ${id}`)
        this.outgoingConn = conn

        // Data received from remote peer
        conn.on('data', (data) => {
          vm.trace(`Received data from ${this} ${id}`)
          vm.onData(data, conn)
        })
      })
    },
    createMessageObject(topic, content) {
      return { topic, content }
    },
    send(data) {
      // Send data to all peers
      Object.entries(this.incomingConns).forEach(([, conn]) => conn.send(data))
    },
    trace(text) {
      if (text[text.length - 1] === '\n') {
        text = text.substring(0, text.length - 1)
      }
      if (window.performance) {
        const now = (window.performance.now() / 1000).toFixed(3)
        console.log(now + ': ' + text)
      } else {
        console.log(text)
      }
    },
  },
}

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

<style scoped>
#title {
  display: inline-block;
  margin-right: 0px;
  width: 100px;
}
#description {
  display: inline-block;
  width: 300px;
}
.btn-default {
  border-color: grey;
}
.input-group {
  position: relative;
  display: flex;
  flex-wrap: nowrap;
  align-items: stretch;
  width: 100%;
  overflow: inherit;
}
</style>
