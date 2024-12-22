<template>
  <q-layout>
    <q-page-container>
      <q-page class="flex flex-center">
        <q-card class="q-pa-lg q-mb-lg login-card">
          <q-card-section>
            <div class="text-h5 text-center text-primary">Anmelden</div>
          </q-card-section>

          <q-card-section>
            <q-input
              v-model="email"
              label="E-Mail"
              type="email"
              filled
              dense
              clearable
              standout="bg-primary text-white"
            />
            <q-input
              v-model="password"
              label="Passwort"
              type="password"
              filled
              dense
              clearable
              standout="bg-primary text-white"
              class="q-mt-md"
            />
          </q-card-section>

          <q-card-actions align="right">
            <q-btn
              flat
              label="Passwort vergessen?"
              @click="goToResetPassword"
              color="primary"
              class="text-primary"
            />
            <q-btn
              label="Anmelden"
              @click="login"
              color="primary"
              class="full-width q-mt-md"
            />
          </q-card-actions>

          <q-card-section v-if="loginError" class="error-text q-mt-md">
            {{ loginError }}
          </q-card-section>

          <q-card-section class="q-mt-md text-center">
            <div class="text-body1">Noch kein Konto?</div>
            <q-btn
              label="Registrieren"
              @click="goToRegister"
              color="secondary"
              class="full-width q-mt-md"
            />
          </q-card-section>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { auth } from "../../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

export default {
  name: "LoginPage",
  setup() {
    const router = useRouter();
    const email = ref("");
    const password = ref("");
    const loginError = ref(null);

    const login = async () => {
      loginError.value = null;
      try {
        await signInWithEmailAndPassword(auth, email.value, password.value);
        router.push("/"); // Nach erfolgreichem Login zur Startseite weiterleiten
      } catch (error) {
        console.error("Login fehlgeschlagen:", error);
        loginError.value =
          "Login fehlgeschlagen. Bitte überprüfen Sie Ihre Anmeldedaten und versuchen Sie es erneut.";
      }
    };

    const goToRegister = () => {
      router.push("/register"); // Zur Registrierungsseite weiterleiten
    };

    const goToResetPassword = () => {
      router.push("/reset-password");
    };

    return {
      email,
      password,
      login,
      goToRegister,
      goToResetPassword,
      loginError,
    };
  },
};
</script>

<style scoped>
.q-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  min-height: 100vh;
  background: linear-gradient(135deg, #e2e2e2 25%, #ffffff 100%);
}

.login-card {
  width: 100%;
  max-width: 400px;
  border-radius: 12px;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  background-color: #ffffff;
}

.text-primary {
  color: #007bff !important;
}

.full-width {
  width: 100%;
}

.q-mt-md {
  margin-top: 16px;
}

.error-text {
  color: #e53935; /* Rot für Fehlernachrichten */
  font-weight: bold;
  text-align: center;
}
</style>
