<script lang="ts" setup>
const props = defineProps({
    title: String,
});
</script>

<template>
    <div class="post">
        <h1>{{ title }}</h1>
        <div>
            <slot></slot>
        </div>
    </div>
</template>

<style>
.post {
    padding: 8px;
}

.post > h1 {
    font-weight: 700;
}
</style>
