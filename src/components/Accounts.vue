<script setup lang="ts">
import { ref } from "vue";
import { pb } from "../Pocketbase/pocketbase";
import  { type RecordModel } from "pocketbase";

// Define the event emitter
const emit = defineEmits<{
  (event: "onLogin", url: string, authToken: string): void;
  (event: "onLogout"): void;
}>();

const email = ref("instructor@flightschool.ai");
const password = ref("1234567890");
const loginFailed = ref(false);
pb.authStore.clear(); // Clear any previous authentication state
const isLoggedIn = ref(pb.authStore.isValid); // Check if the user is logged in

const userInfo = ref<RecordModel | null>(pb.authStore.record); // or `pb.authStore.record`
const authError = ref<unknown>(null);
let token = "";

const login = async (email: string, password: string) => {
  try {
    const authResult = await pb
      .collection("users")
      .authWithPassword(email, password);
    userInfo.value = authResult.record;
    token = authResult.token;
    // const payload = getTokenPayload(token);
    emit("onLogin", pb.baseURL, token); // Emit the login event with the JWT token
//     {
//     "collectionId": "_pb_users_auth_",
//     "exp": 1752856419,
//     "id": "hemygubhpj0n31d",
//     "refreshable": true,
//     "type": "auth"
// }
    isLoggedIn.value = true;
    authError.value = null;
  } catch (error) {
    userInfo.value = null;
    authError.value = error;
    isLoggedIn.value = false;
    loginFailed.value = true;
    console.error("Authentication failed:", error);
  }

};

const logout = () => {
  pb.authStore.clear();
  userInfo.value = null;
  isLoggedIn.value = false;
  loginFailed.value = false;
  emit("onLogout"); // Emit logout event to clear any previous state
};

async function toggleAuth() {
  if (!isLoggedIn.value) {
    await login(email.value, password.value);
  } else {
    logout();
  }
}
</script>

<template>
  <div class="w-full rounded-lg shadow-md">
    <div class="flex flex-col gap-1">
      <input
        v-model="email"
        type="email"
        placeholder="Email"
        :disabled="isLoggedIn"
        v-on:focus="loginFailed = false"
        class="pl-1 text-secondary bg-primary w-full border border-simElementBorder"
      />
      <input
        v-model="password"
        type="password"
        placeholder="Password"
        :disabled="isLoggedIn"
        v-on:focus="loginFailed = false"
        class="pl-1 text-secondary bg-primary w-full border border-simElementBorder"
      />
      <button
        @click="toggleAuth"
        class="border border-simElementBorder w-full"
        :class="
          loginFailed
            ? 'bg-panelActive text-primary'
            : isLoggedIn
              ? 'bg-simActiveButton text-primary'
              : 'text-secondary'
        "
      >
        {{
          loginFailed
            ? `Login Failed: ${authError}`
            : isLoggedIn
              ? `Logout ${userInfo?.name} | ${userInfo?.role}`
              : "Login"
        }}
      </button>
    </div>
  </div>
</template>
