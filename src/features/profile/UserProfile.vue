<template>
  <q-layout>
    <q-page-container>
      <q-page padding>
        <q-toolbar class="bg-primary text-white">
          <q-btn flat dense round icon="arrow_back" @click="goBack" />
          <q-toolbar-title>Profil</q-toolbar-title>
        </q-toolbar>

        <q-card class="q-pa-md">
          <q-card-section>
            <div class="text-h6">Benutzerprofil</div>
          </q-card-section>

          <q-card-section>
            <q-input v-model="displayName" label="Name" filled />
            <q-input
              v-model="email"
              label="Email"
              type="email"
              filled
              class="q-mt-sm"
              readonly
            />
          </q-card-section>

          <!-- Avatar Auswahl -->
          <q-card-section>
            <div class="text-h6">Avatar auswählen</div>
            <div class="row q-col-gutter-md justify-center">
              <!-- Avatar Icons Liste -->
              <q-avatar
                v-for="avatar in availableAvatars"
                :key="avatar"
                @click="selectAvatar(avatar)"
                size="lg"
                class="q-mt-md"
                :style="{
                  border: selectedAvatar === avatar ? '2px solid blue' : '',
                }"
              >
                <img :src="avatar" />
              </q-avatar>
            </div>
          </q-card-section>

          <q-card-actions align="right">
            <q-btn
              label="Speichern"
              @click="updateProfile"
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
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { auth, db } from "../../firebase";
import { updateProfile } from "firebase/auth";
import {
  doc,
  updateDoc,
  getDocs,
  collection,
  query,
  where,
  writeBatch,
} from "firebase/firestore";

export default {
  name: "UserProfilePage",
  setup() {
    const router = useRouter();
    const displayName = ref("");
    const email = ref("");

    // Verwende direkte Pfade für die Bilder im public Ordner
    const availableAvatars = ref([
      "/avatars/astronaut.png",
      "/avatars/girl.png",
      "/avatars/gamer.png",
      "/avatars/dinosaur.png",
      "/avatars/hacker.png",
      "/avatars/man.png",
      "/avatars/user.png",
      "/avatars/woman.png",
      "/avatars/woman(1).png",
      "/avatars/woman(2).png",
    ]);

    const selectedAvatar = ref(auth.currentUser?.photoURL || "");

    const selectAvatar = (avatar) => {
      selectedAvatar.value = avatar;
    };

    onMounted(() => {
      const user = auth.currentUser;
      if (user) {
        displayName.value = user.displayName || "";
        email.value = user.email || "";
      }
    });

    const updateProfileData = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          // Update Benutzerprofil in Firebase Auth
          await updateProfile(user, {
            displayName: displayName.value,
            photoURL: selectedAvatar.value,
          });

          // Update Gruppenmitglieder mit neuem Avatar
          const groupQuery = query(
            collection(db, "groups"),
            where("members.userId", "==", user.uid)
          );
          const groupSnapshot = await getDocs(groupQuery);

          const batch = writeBatch(db); // Verwende writeBatch statt db.batch()

          groupSnapshot.forEach((groupDoc) => {
            const groupData = groupDoc.data();
            const updatedMembers = groupData.members.map((member) =>
              member.userId === user.uid
                ? { ...member, avatar: selectedAvatar.value }
                : member
            );

            const groupRef = doc(db, "groups", groupDoc.id);
            batch.update(groupRef, { members: updatedMembers });
          });

          await batch.commit(); // Commit Batch-Update

          alert("Profil und Avatar wurden erfolgreich aktualisiert.");
        } catch (error) {
          console.error("Fehler beim Aktualisieren des Profils:", error);
        }
      }
    };

    const goBack = () => {
      router.push("/");
    };

    return {
      displayName,
      email,
      availableAvatars,
      selectedAvatar,
      selectAvatar,
      updateProfile: updateProfileData,
      goBack,
    };
  },
};
</script>

<style scoped>
.q-toolbar-title {
  font-weight: bold;
  color: white;
}

.q-card {
  max-width: 400px;
  margin: auto;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.q-card-section {
  padding: 16px;
}

.full-width {
  width: 100%;
}

.q-mt-sm {
  margin-top: 8px;
}

.q-mt-md {
  margin-top: 16px;
}

.q-col-gutter-md {
  gap: 16px;
}
</style>
