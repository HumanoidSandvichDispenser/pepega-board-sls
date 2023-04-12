<script lang="ts" setup>
const props = defineProps({
    id: String,
    title: String,
    owner: String,
    ownerDisplayName: String,
    ownerUsername: String,
    isPublic: Boolean,
});
</script>

<template>
    <div class="post">
        <h1>{{ title }}</h1>
        <div>
            <slot></slot>
        </div>
        <div class="info">
            <i class="left">
                Asked
                <span v-if="owner">
                    <!-- show "asked by you" if anonymous -->
                    by
                    <span v-if="isPublic">{{ ownerDisplayName }} (@{{ ownerUsername }})</span>
                    <span v-else>you anonymously</span>
                </span>
                <span v-else>
                    anonymously
                </span>
            </i>
            <span class="right">
                <code>{{ id }}</code>
            </span>
        </div>
    </div>
</template>

<style>
.post {
    display: flex;
    flex-direction: column;
    row-gap: 8px;
}

.post > h1 {
    font-weight: 600;
    font-size: 1.5em;
    margin: 0;
}

.post .info {
    display: flex;
    color: var(--fg1);
}

.post .info > * {
    flex-grow: 1;
}

.post .info .right {
    text-align: right;
}
</style>
