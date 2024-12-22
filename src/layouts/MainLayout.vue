<template>
  <q-layout view="hHh lpR fFf">
    <!-- Haupt-Toolbar -->
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
          class="text-white"
        />
        <q-toolbar-title> WG-Manager </q-toolbar-title>

        <!-- Dark Mode Umschalter -->
        <DarkModeToggle />

        <div>
          <q-btn
            flat
            dense
            round
            icon="account_circle"
            @click="navigateTo('profile')"
            aria-label="Account"
            class="text-white"
          />
        </div>
      </q-toolbar>
    </q-header>

    <!-- Seitliches Menü -->
    <q-drawer v-model="leftDrawerOpen" show-if-above bordered class="bg-grey-2">
      <q-list>
        <q-item-label header>Navigation</q-item-label>

        <!-- Startseite -->
        <q-item clickable v-ripple @click="navigateTo('')">
          <q-item-section avatar>
            <q-icon name="home" />
          </q-item-section>
          <q-item-section>Startseite</q-item-section>
        </q-item>

        <!-- Meine Gruppen -->
        <q-item clickable v-ripple @click="navigateTo('groups')">
          <q-item-section avatar>
            <q-icon name="group" />
          </q-item-section>
          <q-item-section>Meine Gruppen</q-item-section>
        </q-item>

        <!-- Mein Profil -->
        <q-item clickable v-ripple @click="navigateTo('profile')">
          <q-item-section avatar>
            <q-icon name="account_circle" />
          </q-item-section>
          <q-item-section>Mein Profil</q-item-section>
        </q-item>

        <!-- Gruppe beitreten -->
        <q-item clickable v-ripple @click="navigateTo('join-group')">
          <q-item-section avatar>
            <q-icon name="group_add" />
          </q-item-section>
          <q-item-section>Gruppe beitreten</q-item-section>
        </q-item>

        <!-- Einstellungen -->
        <q-item clickable v-ripple @click="navigateTo('settings')">
          <q-item-section avatar>
            <q-icon name="settings" />
          </q-item-section>
          <q-item-section>Einstellungen</q-item-section>
        </q-item>

        <!-- Ausloggen -->
        <q-item clickable v-ripple @click="logout">
          <q-item-section avatar>
            <q-icon name="exit_to_app" />
          </q-item-section>
          <q-item-section>Ausloggen</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <!-- Hauptinhalt -->
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { auth } from "../firebase"; // Importiere Firebase-Auth
import DarkModeToggle from "components/DarkModeToggle.vue"; // DarkMode Umschalter importieren

const leftDrawerOpen = ref(false);
const router = useRouter();

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

function navigateTo(page) {
  router.push(`/${page}`);
}

async function logout() {
  try {
    await auth.signOut(); // Benutzer ausloggen
    router.push("/login"); // Zur Login-Seite weiterleiten
  } catch (error) {
    console.error("Fehler beim Ausloggen:", error);
  }
}
</script>

<style scoped>
.q-toolbar-title {
  font-weight: bold;
  color: white;
}

.q-drawer {
  width: 250px;
}

.q-item-section {
  font-size: 1.1em;
}

.q-page-container {
  background-color: #f9f9f9;
  padding: 16px;
}

.dark .q-page-container {
  background-color: #1e1e1e;
}

.dark .q-item-section {
  color: #fff;
}
</style>
