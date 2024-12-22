<template>
  <q-layout>
    <q-page-container>
      <q-page padding>
        <q-toolbar class="bg-primary text-white shadow-2">
          <q-toolbar-title class="text-bold">Meine Gruppen</q-toolbar-title>
          <q-btn
            flat
            dense
            round
            icon="add"
            @click="openGroupDialog"
            color="white"
            label="Neue Gruppe"
            class="q-ml-auto text-weight-bold"
          />
        </q-toolbar>

        <!-- Gruppenliste anzeigen -->
        <q-list class="q-pa-md">
          <q-card
            v-for="group in userGroups"
            :key="group.id"
            class="q-mb-md q-hoverable shadow-2"
            clickable
            v-ripple
          >
            <q-card-section
              @click="goToGroup(group.id)"
              class="row items-center"
            >
              <q-icon name="group" size="md" class="q-mr-md text-primary" />
              <div class="q-ml-sm">
                <div class="text-h6 text-bold">{{ group.name }}</div>
                <q-separator class="q-my-xs" />
                <div class="text-subtitle2">
                  Beschreibung: {{ group.description }}
                </div>
                <div class="text-caption">
                  Mitglieder: {{ group.members.length }}
                </div>

                <!-- Overlapping Avatars -->
                <div class="row q-gutter-sm">
                  <q-avatar
                    v-for="(member, index) in group.members.slice(0, 4)"
                    :key="index"
                    size="xs"
                    class="overlapping-avatar"
                  >
                    <img :src="getMemberAvatar(member)" />
                  </q-avatar>
                  <!-- Falls es mehr als 4 Mitglieder gibt, ein "+" anzeigen -->
                  <q-avatar
                    v-if="group.members.length > 4"
                    size="xs"
                    class="overlapping-avatar"
                  >
                    +{{ group.members.length - 4 }}
                  </q-avatar>
                </div>
              </div>
            </q-card-section>

            <!-- Admin-Optionen anzeigen (z.B. Löschen) -->
            <q-card-actions align="right" v-if="isAdminOfGroup(group)">
              <q-btn
                flat
                icon="delete"
                color="negative"
                @click="confirmDeleteGroup(group.id)"
                label="Löschen"
                class="q-px-sm q-ml-sm text-weight-bold"
              />
            </q-card-actions>
          </q-card>

          <!-- Hinweis, wenn keine Gruppen vorhanden sind -->
          <q-card v-if="userGroups.length === 0" class="q-mt-md">
            <q-card-section>
              <div class="text-subtitle1 text-center">
                Du bist noch in keiner Gruppe. Erstelle eine neue Gruppe oder
                tritt einer bestehenden bei.
              </div>
            </q-card-section>
          </q-card>
        </q-list>

        <!-- Dialog zur Erstellung einer neuen Gruppe -->
        <q-dialog v-model="groupDialog">
          <q-card>
            <q-card-section>
              <div class="text-h6">Neue Gruppe erstellen</div>
            </q-card-section>

            <q-card-section>
              <q-input
                v-model="newGroupName"
                label="Gruppenname"
                dense
                outlined
              />
              <q-input
                v-model="newGroupDescription"
                label="Gruppenbeschreibung"
                dense
                outlined
              />
            </q-card-section>

            <q-card-actions align="right">
              <q-btn
                flat
                label="Abbrechen"
                @click="groupDialog = false"
                class="q-mr-sm"
              />
              <q-btn
                flat
                label="Erstellen"
                color="primary"
                @click="createGroup"
              />
            </q-card-actions>
          </q-card>
        </q-dialog>

        <!-- Bestätigungsdialog für das Löschen -->
        <q-dialog v-model="confirmDeleteDialog">
          <q-card>
            <q-card-section>
              <div class="text-h6">Bist du sicher?</div>
              <p>
                Möchtest du diese Gruppe wirklich löschen? Diese Aktion kann
                nicht rückgängig gemacht werden.
              </p>
            </q-card-section>

            <q-card-actions align="right">
              <q-btn
                flat
                label="Abbrechen"
                @click="confirmDeleteDialog = false"
              />
              <q-btn
                flat
                label="Löschen"
                color="negative"
                @click="deleteGroup(confirmedGroupId)"
              />
            </q-card-actions>
          </q-card>
        </q-dialog>

        <!-- Dialog für Fehler oder Erfolg -->
        <q-dialog v-model="errorDialog">
          <q-card>
            <q-card-section>
              <div class="text-h6">Fehler</div>
              <p>{{ errorMessage }}</p>
            </q-card-section>
            <q-card-actions align="right">
              <q-btn
                flat
                label="Schließen"
                color="primary"
                @click="errorDialog = false"
              />
            </q-card-actions>
          </q-card>
        </q-dialog>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script>
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { auth, db } from "../../firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  Timestamp,
  deleteDoc,
  doc,
} from "firebase/firestore";

export default {
  name: "GroupManagementPage",
  setup() {
    const router = useRouter();
    const userGroups = ref([]);
    const groupDialog = ref(false);
    const confirmDeleteDialog = ref(false); // Dialog zur Bestätigung des Löschens
    const confirmedGroupId = ref(null); // Die ID der Gruppe, die gelöscht werden soll
    const newGroupName = ref("");
    const newGroupDescription = ref(""); // Beschreibung hinzufügen
    const errorDialog = ref(false);
    const errorMessage = ref("");
    const currentUser = ref(auth.currentUser);
    let unsubscribe = null;

    // Echtzeit-Updates für Gruppen
    const loadUserGroups = () => {
      try {
        const groupsCollection = collection(db, "groups");

        unsubscribe = onSnapshot(groupsCollection, (snapshot) => {
          userGroups.value = snapshot.docs
            .map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }))
            .filter((group) =>
              group.members.some(
                (member) => member.userId === currentUser.value.uid
              )
            );
        });
      } catch (error) {
        errorMessage.value = "Fehler beim Laden der Gruppen.";
        errorDialog.value = true;
      }
    };

    const getMemberAvatar = (member) => {
      return member.avatar || "/avatars/user.png"; // Fallback für Avatare
    };

    // Gruppe löschen, wenn der aktuelle Nutzer Admin ist
    const deleteGroup = async (groupId) => {
      try {
        const groupDoc = doc(db, "groups", groupId);
        await deleteDoc(groupDoc);
        confirmDeleteDialog.value = false; // Bestätigungsdialog schließen
      } catch (error) {
        errorMessage.value = "Fehler beim Löschen der Gruppe.";
        errorDialog.value = true;
      }
    };

    // Bestätigungsdialog anzeigen
    const confirmDeleteGroup = (groupId) => {
      confirmedGroupId.value = groupId; // Speichere die zu löschende Gruppen-ID
      confirmDeleteDialog.value = true; // Öffne den Bestätigungsdialog
    };

    // Admin-Check für die Gruppen
    const isAdminOfGroup = (group) => {
      return group.members.some(
        (member) =>
          member.userId === currentUser.value.uid && member.role === "admin"
      );
    };

    // Neue Gruppe erstellen
    const createGroup = async () => {
      if (newGroupName.value.trim()) {
        try {
          const currentUserId = currentUser.value.uid;
          const username =
            currentUser.value.displayName || currentUser.value.email;

          // Gruppe mit Beschreibung erstellen
          await addDoc(collection(db, "groups"), {
            name: newGroupName.value,
            description: newGroupDescription.value, // Beschreibung speichern
            createdBy: currentUserId,
            createdAt: Timestamp.now(),
            members: [{ userId: currentUserId, name: username, role: "admin" }],
          });

          newGroupName.value = "";
          newGroupDescription.value = ""; // Zurücksetzen nach der Erstellung
          groupDialog.value = false;
        } catch (error) {
          errorMessage.value = "Fehler beim Erstellen der Gruppe.";
          errorDialog.value = true;
        }
      }
    };

    const goToGroup = (groupId) => {
      router.push(`/group/${groupId}`);
    };

    onUnmounted(() => {
      if (unsubscribe) unsubscribe();
    });

    onMounted(() => {
      loadUserGroups();
    });

    return {
      userGroups,
      groupDialog,
      confirmDeleteDialog,
      confirmedGroupId,
      newGroupName,
      newGroupDescription,
      createGroup,
      goToGroup,
      deleteGroup,
      confirmDeleteGroup,
      isAdminOfGroup,
      getMemberAvatar,
      errorDialog,
      errorMessage,
      openGroupDialog: () => (groupDialog.value = true),
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
  border: 1px solid var(--q-primary);
}

.q-card-actions {
  border-top: 1px solid var(--q-primary);
}

.q-my-sm {
  margin-top: 8px;
  margin-bottom: 8px;
}

.q-mt-md {
  margin-top: 16px;
}

/* Overlapping Avatar Styling */
.overlapping-avatar {
  position: relative;
  z-index: 1;
  margin-left: -8px;
  border: 2px solid white; /* Um den Übergang zwischen den Avataren zu verdeutlichen */
}
</style>
