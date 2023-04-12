import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
//import { RouterView } from "vue-router";
import Router from "./router";
import { createPinia } from "pinia";

const pinia = createPinia();

createApp(App)
    .use(Router)
    .use(pinia)
    .mount("#app");
