const routes = [
  {
    path: "/",
    component: () => import("layouts/MainLayout.vue"),
    children: [
      {
        path: "", // Startseite
        component: () => import("pages/IndexPage.vue"),
        meta: { requiresAuth: true },
      },
      // Weitere Routen
      {
        path: "/join-group",
        component: () => import("src/features/group/JoinGroup.vue"),
        meta: { requiresAuth: true },
      },
      {
        path: "/profile",
        component: () => import("src/features/profile/UserProfile.vue"),
        meta: { requiresAuth: true },
      },
      {
        path: "groups",
        component: () => import("src/features/group/GroupManagementPage.vue"),
        meta: { requiresAuth: true },
      },
      {
        path: "group/:groupId",
        component: () => import("src/features/group/GroupDetailPage.vue"),
        meta: { requiresAuth: true },
      },
      {
        path: "group/:groupId/tasks",
        component: () => import("src/features/tasks/TasksPage.vue"),
        meta: { requiresAuth: true },
      },
      {
        path: "group/:groupId/shopping-list",
        component: () => import("src/features/shopping/ShoppingListPage.vue"),
        meta: { requiresAuth: true },
      },
      {
        path: "group/:groupId/chat",
        component: () => import("src/features/group/ChatPage.vue"),
        meta: { requiresAuth: true },
      },
      {
        path: "group/:groupId/cleaning-schedule",
        component: () => import("src/features/tasks/CleaningSchedulePage.vue"),
        meta: { requiresAuth: true },
      },
    ],
  },
  {
    path: "/login",
    component: () => import("src/features/auth/Login.vue"),
  },
  {
    path: "/register",
    component: () => import("src/features/auth/Register.vue"),
  },
  {
    path: "/reset-password",
    component: () => import("src/features/auth/ResetPassword.vue"),
  },
  {
    path: "/:catchAll(.*)*",
    component: () => import("pages/ErrorNotFound.vue"),
  },
];

export default routes;
