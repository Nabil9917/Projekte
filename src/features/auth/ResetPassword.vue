<template>
  <q-layout>
    <q-page-container>
      <q-page class="flex flex-center">
        <q-card class="q-pa-md q-mb-md" style="max-width: 400px">
          <q-card-section>
            <div class="text-h6">Passwort zurücksetzen</div>
          </q-card-section>

          <q-card-section>
            <q-input v-model="email" label="Email" type="email" filled />
          </q-card-section>

          <q-card-actions align="right">
            <q-btn
              label="Passwort zurücksetzen"
              @click="resetPassword"
              color="primary"
              class="full-width"
            />
          </q-card-actions>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { auth } from "../../firebase";
import { sendPasswordResetEmail } from "firebase/auth";

export default {
  name: "ResetPasswordPage",
  setup() {
    const router = useRouter();
    const email = ref("");

    const resetPassword = async () => {
      try {
        await sendPasswordResetEmail(auth, email.value);
        alert("Eine E-Mail zum Zurücksetzen des Passworts wurde gesendet.");
        router.push("/login"); // Zur Login-Seite weiterleiten
      } catch (error) {
        console.error("Fehler beim Zurücksetzen des Passworts:", error);
      }
    };

    return {
      email,
      resetPassword,
    };
  },
};
</script>

<style scoped>
.q-page {
  max-width: 100%;
  padding: 32px;
}

.q-card {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.q-card-section {
  padding: 16px;
}

.full-width {
  width: 100%;
}
</style>
