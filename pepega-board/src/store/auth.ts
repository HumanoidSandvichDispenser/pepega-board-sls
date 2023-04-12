import axios from "axios";
import { defineStore } from "pinia";
import { getEndpoint } from "../utils";
import { ref } from "vue";
import { Buffer } from "buffer";

export const useAuthStore = defineStore("auth", () => {
    const id = ref("");
    const username = ref("");
    const displayName = ref("");
    const jwt = ref("");

    function decodeToken(token: string) {
        const enc = token.split(".")[1];
        return JSON.parse(Buffer.from(enc, "base64").toString());
    }

    async function authenticate(
        _username: string,
        pw: string,
        _displayName = "",
        isRegistering = false,
    ) {
        const path = isRegistering ? "register" : "login";
        const response = await axios
            .post(getEndpoint(path), {
                username: _username,
                displayName: _displayName,
                pw,
            }, { withCredentials: true });
        let cookie = response.headers["set-cookie"];
        console.log("cookie = " + cookie);
        jwt.value = response.data.token;
        id.value = response.data.id;
        username.value = response.data.username;
        displayName.value = response.data.displayName ?? displayName.value;
        return response;
    }

    return {
        id,
        username,
        displayName,
        authenticate,
    }
});
