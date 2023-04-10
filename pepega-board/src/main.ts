import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
//import { RouterView } from "vue-router";
import Router from "./router";

createApp(App)
    .use(Router)
    .mount("#app");
