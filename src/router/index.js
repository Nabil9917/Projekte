import { route } from "quasar/wrappers";
import {
  createRouter,
  createMemoryHistory,
  createWebHistory,
  createWebHashHistory,
} from "vue-router";
import routes from "./routes";
import { auth } from "../firebase"; // Stelle sicher, dass auth korrekt importiert wird

export default route(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === "history"
    ? createWebHistory
    : createWebHashHistory;

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    history: createHistory(process.env.VUE_ROUTER_BASE),
  });

  Router.beforeEach((to, from, next) => {
    auth.onAuthStateChanged((user) => {
      const requiresAuth = to.matched.some(
        (record) => record.meta.requiresAuth
      );

      if (requiresAuth && !user) {
        next("/login"); // Wenn der Benutzer nicht eingeloggt ist, zur Login-Seite weiterleiten
      } else {
        next(); // Ansonsten weiter zur gewünschten Route
      }
    });
  });

  return Router;
});
