<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useAuthStore } from "../store/auth";
import { router } from "../router";
import { useRoute } from "vue-router";

const auth = useAuthStore();

const username = ref("");
const displayName = ref("");
const pw = ref("");
const authType = ref("login");
const isLoading = ref(false);

function authenticate() {
    isLoading.value = true;
    auth.authenticate(
        username.value,
        pw.value,
        displayName.value,
        isRegistering.value)
        .then((response) => {
            console.log(response);
        })
        .finally(() => {
            isLoading.value = false;
        });
}

const route = useRoute();

const isRegistering = computed(() => route.path == "/register");

function passwordKeydown(event: KeyboardEvent) {
    if (event.key == "Enter") {
        authenticate();
    }
}
</script>

<template>
    <div class="login">
        <div class="login-main">
            <div class="center">
                <div v-if="isRegistering">
                    <h3>
                        REGISTER ACCOUNT
                    </h3>
                    <router-link to="/login">Log in</router-link>
                    if you already have an account
                </div>
                <div v-else>
                    <h3>
                        LOG IN
                    </h3>
                    <router-link to="/register">Register</router-link>
                    if you do not have an account yet
                </div>
                <br>
                <div>
                    <input
                        name="username"
                        v-model="username"
                        placeholder="Username"
                    />
                </div>
                <div v-if="isRegistering">
                    <input
                        name="display-name"
                        v-model="displayName"
                        :placeholder="`Display name (default: ${username})`"
                    />
                </div>
                <div>
                    <input
                        name="password"
                        v-model="pw"
                        placeholder="Password"
                        type="password"
                        @keydown="passwordKeydown"
                    />
                </div>
                <button :disabled="isLoading" @click="authenticate">Login</button>
            </div>
        </div>
    </div>
</template>

<style scoped>
h3 {
    font-weight: 500;
}

.login {
    display: flex;
    flex-direction: column;
    align-self: center;
}

.login-main {
    width: 256px;
    align-self: center;
}

input {
    margin-bottom: 8px;
    width: 100%;
}

button {
    width: 100%;
    text-transform: uppercase;
}
</style>
