<script setup lang="ts">
import { useStore } from "../store";
import SubmissionVue from "../components/Submission.vue";
import PostVue from "../components/Post.vue";
import { onMounted, ref } from "vue";

const store = useStore();
const replyingTo = ref<string>();

onMounted(() => store.fetchRecentPosts());

function toggleSubmission() {
    if (replyingTo.value != "") {
        replyingTo.value = "";
    } else {
        replyingTo.value = undefined;
    }
}
</script>

<template>
    <div class="home">
        <h1>Pepegaboard</h1>
        <div v-if="replyingTo == ''">
            <submission-vue @cancel="replyingTo = undefined" v-if="replyingTo == ''" />
        </div>
        <div v-else>
            <button @click="toggleSubmission">Create Post</button>
        </div>
        <div class="post-list">
            <div class="post-container" v-for="post in store.posts">
                <post-vue
                    :id="post.PK"
                    :title="post.title"
                    :owner="post.owner"
                    :owner-username="post.owner_username"
                    :owner-display-name="post.owner_display_name"
                    :is-public="post.is_public"
                >
                    {{ post.preview }}
                </post-vue>
                <!--submission-vue
                    v-if="replyingTo == post.PK"
                    :reply-to="replyingTo"
                    @cancel="replyingTo = undefined"
                /-->
            </div>
        </div>
    </div>
</template>

<style>
.post-list {
    margin-top: 16px;
    display: flex;
    flex-direction: column;
    row-gap: 16px;
}

.post-container {
    display: flex;
    flex-direction: column;
    row-gap: 8px;
    background-color: var(--bg0);
    padding: 16px;
    border-radius: 8px;
    border: 1px solid var(--bg2);
}
</style>
