import { defineStore } from "pinia";
import { computed, reactive, ref } from "vue";
import { getEndpoint } from "../utils";
import axios from "axios";

const API_ENDPOINT: string = import.meta.env.VITE_API_ENDPOINT;

export const useStore = defineStore("store", () => {
    const userIDMaps = reactive({ });

    const posts = ref<{ [key: string]: any }[]>([]);

    function fetchRecentPosts() {
        fetch(API_ENDPOINT + "/get-posts")
            .then((response) => response.json())
            .then((json) => {
                console.log(json);
                if (typeof json == "object") {
                    posts.value = json;
                }
            });
    }

    function createPost(title: string, text: string, other?: any) {
        axios
            .post(getEndpoint("create-post"), {
                title,
                text,
                ...other,
            }, {
                withCredentials: true,
            }).then((post) => {
                posts.value.splice(posts.value.length - 1);
                posts.value.unshift(post.data);
                console.log(posts.value);
            });
    }

    return {
        userIDMaps,
        posts,
        fetchRecentPosts,
        createPost,
    };
});
