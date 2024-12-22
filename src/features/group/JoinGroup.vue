<template>
  <q-layout>
    <q-page-container>
      <q-page class="flex flex-center">
        <q-card
          class="q-pa-md q-mb-md"
          style="
            max-width: 400px;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          "
        >
          <q-card-section>
            <div class="text-h6 text-center">
              <q-icon name="group_add" size="32px" class="q-mb-sm" />
              Einer Gruppe beitreten
            </div>
          </q-card-section>

          <q-card-section>
            <q-input
              v-model="groupId"
              label="Gruppen-ID"
              placeholder="Gib die Gruppen-ID ein"
              filled
              class="q-pa-xs"
              outlined
            />
          </q-card-section>

          <q-card-actions align="right">
            <q-btn
              label="Beitreten"
              color="primary"
              @click="joinGroup"
              class="full-width q-mt-md"
              style="border-radius: 8px"
              :style="{ backgroundColor: joinError ? '#f44336' : '#1976d2' }"
            />
          </q-card-actions>

          <!-- Fehlernachricht bei einem Fehler -->
          <q-card-section v-if="joinError" class="error-text">
            {{ joinError }}
          </q-card-section>

          <!-- Erfolgsmeldung bei erfolgreichem Beitritt -->
          <q-card-section v-if="joinSuccess" class="success-text">
            {{ joinSuccess }}
          </q-card-section>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>
<script>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { db, auth } from "../../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";

export default {
  name: "JoinGroup",
  setup() {
    const router = useRouter();
    const groupId = ref("");
    const joinError = ref(null);
    const joinSuccess = ref(null);
    const currentUser = auth.currentUser;

    const joinGroup = async () => {
      joinError.value = null;
      joinSuccess.value = null;

      try {
        // Firebase-Abfrage zur Suche der Gruppe anhand der Gruppen-ID
        const groupsCollection = collection(db, "groups");
        const q = query(
          groupsCollection,
          where("groupId", "==", groupId.value)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const groupDoc = querySnapshot.docs[0];
          const groupRef = groupDoc.ref;
          const userId = currentUser.uid;
          const username = currentUser.displayName || currentUser.email;

          const groupData = groupDoc.data();
          const isAlreadyMember = groupData.members.some(
            (member) => member.userId === userId
          );

          if (!isAlreadyMember) {
            // Füge das aktuelle Mitglied zur Gruppe hinzu
            await updateDoc(groupRef, {
              members: arrayUnion({ userId, name: username, role: "member" }),
            });
            joinSuccess.value = "Du bist der Gruppe erfolgreich beigetreten!";
            setTimeout(() => {
              router.push(`/group/${groupDoc.id}`); // Weiterleitung zur Gruppenseite nach Beitritt
            }, 1500);
          } else {
            joinError.value = "Du bist bereits Mitglied dieser Gruppe.";
          }
        } else {
          joinError.value = "Gruppe mit dieser ID wurde nicht gefunden.";
        }
      } catch (error) {
        console.error("Fehler beim Beitreten zur Gruppe:", error);
        joinError.value =
          "Es gab ein Problem beim Beitreten zur Gruppe. Bitte versuche es erneut.";
      }
    };

    return {
      groupId,
      joinError,
      joinSuccess,
      joinGroup,
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

.q-mb-md {
  margin-bottom: 16px;
}

.full-width {
  width: 100%;
}

.error-text {
  color: #f44336; /* Rot für Fehlernachrichten */
  font-weight: bold;
  text-align: center;
}

.success-text {
  color: #4caf50; /* Grün für Erfolgsmeldungen */
  font-weight: bold;
  text-align: center;
}
</style>
