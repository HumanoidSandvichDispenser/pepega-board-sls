<script setup lang="ts">
import { useStore } from "../store";
import { onMounted, ref } from "vue";

const props = defineProps({
    replyTo: String,
});

defineEmits(["cancel"]);

const store = useStore();

const title = ref("");
const text = ref("");
const askType = ref("anonymous");

function submit() {
    store.createPost(
        title.value,
        text.value,
        {
            isPublic: askType.value == "public",
        },
    );
}
</script>

<template>
    <div class="submission">
        <input v-if="!replyTo"
            class="text"
            v-model="title"
            placeholder="Title (max. 64 characters)"
        />
        <textarea v-model="text" placeholder="Text (max. 1024 characters)" />
        <div class="footer">
            <div v-if="!replyTo">
                <span>
                    <input name="ask-type" v-model="askType" type="radio" value="anonymous" />
                    <label for="ask-type">Post anonymously</label>
                </span>
                <span>
                    <input name="ask-type" v-model="askType" type="radio" value="public" />
                    <label for="ask-type">Post publicly</label>
                </span>
            </div>
            <div>
                <button class="submit" @click="submit">
                    <span v-if="replyTo">
                        Reply
                    </span>
                    <span v-else>
                        Submit
                    </span>
                </button>
                <button class="submit" @click="$emit('cancel')">
                    Cancel
                </button>
            </div>
        </div>
    </div>
</template>

<style>
.submission {
    display: flex;
    flex-direction: column;
    row-gap: 8px;
}

input.text,
textarea {
    width: 100%;
}

textarea {
    resize: vertical;
}

button.submit {
    float: right;
    margin-left: 8px;
}

.submission .footer {
    display: flex;
    flex-direction: row;
}

.submission .footer > div {
    flex-grow: 1;
}
</style>
