<template>
  <q-layout>
    <q-page-container>
      <q-page class="flex flex-center">
        <q-card class="q-pa-lg q-mb-lg register-card">
          <q-card-section>
            <div class="text-h5 text-center text-primary">Registrieren</div>
          </q-card-section>

          <q-card-section>
            <q-input
              v-model="username"
              label="Benutzername"
              filled
              dense
              clearable
              standout="bg-primary text-white"
            />
            <q-input
              v-model="email"
              label="Email"
              type="email"
              filled
              dense
              clearable
              standout="bg-primary text-white"
              class="q-mt-md"
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
            <q-input
              v-model="confirmPassword"
              label="Passwort bestätigen"
              type="password"
              filled
              dense
              clearable
              standout="bg-primary text-white"
              class="q-mt-md"
            />
          </q-card-section>

          <q-card-actions align="right" class="q-mt-md">
            <q-btn
              label="Registrieren"
              @click="register"
              color="primary"
              class="full-width"
            />
          </q-card-actions>
        </q-card>

        <!-- Erfolgsdialog -->
        <q-dialog v-model="registerSuccessDialog" persistent>
          <q-card>
            <q-card-section class="row items-center">
              <q-avatar icon="done" color="green" text-color="white" />
              <span class="q-ml-md">Registrierung erfolgreich!</span>
            </q-card-section>
            <q-card-actions align="right">
              <q-btn label="OK" color="primary" @click="closeSuccessDialog" />
            </q-card-actions>
          </q-card>
        </q-dialog>

        <!-- Fehlerdialog -->
        <q-dialog v-model="registerErrorDialog" persistent>
          <q-card>
            <q-card-section class="row items-center">
              <q-avatar icon="error" color="red" text-color="white" />
              <span class="q-ml-md">
                Registrierung fehlgeschlagen: {{ errorMessage }}
              </span>
            </q-card-section>
            <q-card-actions align="right">
              <q-btn
                label="OK"
                color="primary"
                @click="registerErrorDialog = false"
              />
            </q-card-actions>
          </q-card>
        </q-dialog>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { auth, db } from "../../firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export default {
  name: "RegisterPage",
  setup() {
    const router = useRouter();
    const username = ref("");
    const email = ref("");
    const password = ref("");
    const confirmPassword = ref("");
    const registerSuccessDialog = ref(false);
    const registerErrorDialog = ref(false);
    const errorMessage = ref("");

    const register = async () => {
      if (password.value !== confirmPassword.value) {
        errorMessage.value = "Die Passwörter stimmen nicht überein.";
        registerErrorDialog.value = true;
        return;
      }

      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email.value,
          password.value
        );
        await updateProfile(userCredential.user, {
          displayName: username.value,
        });

        // Benutzername und andere Daten in Firestore speichern
        await setDoc(doc(db, "users", userCredential.user.uid), {
          username: username.value,
          email: email.value,
        });

        registerSuccessDialog.value = true;
      } catch (error) {
        errorMessage.value = error.message || "Unbekannter Fehler";
        registerErrorDialog.value = true;
      }
    };

    const closeSuccessDialog = () => {
      registerSuccessDialog.value = false;
      router.push("/"); // Nach erfolgreicher Registrierung zur Startseite weiterleiten
    };

    return {
      username,
      email,
      password,
      confirmPassword,
      register,
      registerSuccessDialog,
      registerErrorDialog,
      errorMessage,
      closeSuccessDialog,
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

.register-card {
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
