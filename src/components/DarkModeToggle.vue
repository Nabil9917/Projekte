<template>
  <q-toggle
    v-model="isDark"
    label="Dark Mode"
    @update:model-value="toggleDarkMode"
  />
</template>

<script>
import { Dark } from "quasar";

export default {
  data() {
    return {
      isDark: Dark.isActive,
    };
  },
  methods: {
    toggleDarkMode(val) {
      Dark.set(val);
      localStorage.setItem("darkMode", val); // Speicherung der Präferenz
    },
  },
  mounted() {
    const darkMode = localStorage.getItem("darkMode");
    if (darkMode !== null) {
      Dark.set(darkMode === "true");
      this.isDark = Dark.isActive;
    }
  },
};
</script>

<style scoped>
.q-toggle {
  margin: 10px;
}
</style>
