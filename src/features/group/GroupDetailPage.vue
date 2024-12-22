<template>
  <q-layout>
    <q-page-container>
      <q-page padding>
        <q-toolbar class="bg-primary text-white">
          <q-btn flat dense round icon="arrow_back" @click="goBack" />
          <q-toolbar-title>{{ groupName }}</q-toolbar-title>
        </q-toolbar>

        <q-list class="q-pa-md">
          <q-card
            v-for="option in groupOptions"
            :key="option.label"
            class="q-mb-md q-hoverable"
            clickable
            v-ripple
            @click="navigateTo(option.page)"
          >
            <q-card-section class="row items-center">
              <q-icon :name="option.icon" size="md" class="q-mr-md" />
              <q-item-label>{{ option.label }}</q-item-label>
            </q-card-section>
          </q-card>
        </q-list>

        <!-- Expansion Item für Gruppen-ID -->
        <q-expansion-item
          expand-separator
          label="Gruppen-ID"
          v-model="expandGroupId"
          icon="key"
          header-class="bg-primary text-white"
        >
          <q-card class="q-pa-md">
            <q-card-section>
              <div class="text-subtitle1">Gruppen-ID:</div>
              <q-input v-model="groupId" readonly />
              <q-btn
                flat
                @click="copyGroupId"
                label="Gruppen-ID kopieren"
                color="primary"
                class="q-mt-md"
              />
            </q-card-section>
          </q-card>
        </q-expansion-item>

        <!-- Expansion Item für Mitglieder -->
        <q-expansion-item
          expand-separator
          label="Mitglieder"
          v-model="expandMembers"
          icon="group"
          header-class="bg-primary text-white"
        >
          <q-card class="q-pa-md">
            <q-card-section>
              <div class="text-h6">Mitglieder</div>
            </q-card-section>
            <q-list>
              <q-item v-for="member in members" :key="member.userId">
                <q-item-section avatar>
                  <q-avatar size="md" rounded>
                    <img :src="getMemberAvatar(member)" />
                  </q-avatar>
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ getUserName(member.userId) }}</q-item-label>
                  <q-item-label caption>{{ member.role }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-btn
                    flat
                    dense
                    @click="promoteToAdmin(member.userId)"
                    label="Befördern"
                    v-if="isAdmin && member.role !== 'admin'"
                  />
                  <q-btn
                    flat
                    dense
                    color="negative"
                    @click="removeMember(member.userId)"
                    label="Entfernen"
                    v-if="isAdmin && member.userId !== currentUserId"
                  />
                  <q-btn
                    flat
                    dense
                    color="negative"
                    @click="leaveGroup"
                    label="Gruppe verlassen"
                    v-if="!isAdmin && member.userId === currentUserId"
                  />
                </q-item-section>
              </q-item>
            </q-list>
          </q-card>
        </q-expansion-item>

        <!-- Expansion Item für Mitglied hinzufügen -->
        <q-expansion-item
          expand-separator
          v-if="isAdmin"
          label="Mitglied hinzufügen"
          v-model="expandAddMember"
          icon="person_add"
          header-class="bg-primary text-white"
        >
          <q-card class="q-pa-md">
            <q-card-section>
              <div class="text-h6">Mitglied hinzufügen</div>
              <q-input
                v-model="newMemberEmailOrUsername"
                label="Benutzername oder Email"
              />
              <q-btn
                flat
                label="Mitglied hinzufügen"
                color="primary"
                @click="addMember"
                class="q-mt-md"
              />
            </q-card-section>
          </q-card>
        </q-expansion-item>

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
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { db, auth } from "../../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  arrayRemove,
  arrayUnion,
  onSnapshot,
  getDocs,
  collection,
  query,
  where,
} from "firebase/firestore";

export default {
  name: "GroupDetailPage",
  setup() {
    const router = useRouter();
    const route = useRoute();
    const groupName = ref("");
    const groupId = ref("");
    const members = ref([]);
    const currentUserId = auth.currentUser?.uid;
    const isAdmin = ref(false);
    const newMemberEmailOrUsername = ref("");
    const errorDialog = ref(false);
    const errorMessage = ref("");

    // v-model für expandierte Items
    const expandGroupId = ref(true); // Gruppen-ID standardmäßig ausgeklappt
    const expandMembers = ref(true); // Mitgliederliste standardmäßig ausgeklappt
    const expandAddMember = ref(true); // Mitglied hinzufügen standardmäßig ausgeklappt

    const groupOptions = ref([
      { label: "Tasks", icon: "list", page: "tasks" },
      { label: "Einkaufsliste", icon: "shopping_cart", page: "shopping-list" },
      { label: "Chat", icon: "chat", page: "chat" },
      {
        label: "Putzplan",
        icon: "cleaning_services",
        page: "cleaning-schedule",
      },
    ]);

    const loadGroupDetails = async () => {
      const groupRef = doc(db, "groups", route.params.groupId);

      // Firebase Listener, der Gruppenänderungen überwacht
      const unsubscribe = onSnapshot(groupRef, (groupDoc) => {
        if (groupDoc.exists()) {
          const groupData = groupDoc.data();
          groupName.value = groupData.name;
          groupId.value = groupData.groupId;
          members.value = groupData.members;
          isAdmin.value = groupData.members.some(
            (member) =>
              member.userId === currentUserId && member.role === "admin"
          );
        }
      });
    };

    const getMemberAvatar = (member) => {
      return member.avatar || "/avatars/user.png";
    };

    const leaveGroup = async () => {
      try {
        const memberToRemove = members.value.find(
          (member) => member.userId === currentUserId
        );

        if (memberToRemove) {
          const groupRef = doc(db, "groups", route.params.groupId);

          await updateDoc(groupRef, {
            members: arrayRemove(memberToRemove),
          });

          router.push("/groups");
        }
      } catch (error) {
        errorMessage.value = "Fehler beim Verlassen der Gruppe.";
        errorDialog.value = true;
      }
    };

    const addMember = async () => {
      try {
        let user = null;

        const userQueryByEmail = query(
          collection(db, "users"),
          where("email", "==", newMemberEmailOrUsername.value)
        );
        const userQueryByUsername = query(
          collection(db, "users"),
          where("username", "==", newMemberEmailOrUsername.value)
        );

        const userSnapshotByEmail = await getDocs(userQueryByEmail);
        const userSnapshotByUsername = await getDocs(userQueryByUsername);

        if (!userSnapshotByEmail.empty) {
          user = userSnapshotByEmail.docs[0].data();
          user.uid = userSnapshotByEmail.docs[0].id;
        } else if (!userSnapshotByUsername.empty) {
          user = userSnapshotByUsername.docs[0].data();
          user.uid = userSnapshotByUsername.docs[0].id;
        }

        if (user) {
          const groupRef = doc(db, "groups", route.params.groupId);
          const memberData = {
            userId: user.uid,
            name: user.username || user.email,
            avatar: user.photoURL || "/avatars/user.png", // Standard-Avatar
            role: "member",
          };
          await updateDoc(groupRef, {
            members: arrayUnion(memberData),
          });
          members.value.push(memberData);
          newMemberEmailOrUsername.value = "";
        } else {
          throw new Error("Benutzer nicht gefunden.");
        }
      } catch (error) {
        errorMessage.value =
          error.message || "Fehler beim Hinzufügen des Mitglieds.";
        errorDialog.value = true;
      }
    };

    const promoteToAdmin = async (userId) => {
      if (!isAdmin.value) return;

      const groupRef = doc(db, "groups", route.params.groupId);
      const updatedMembers = members.value.map((member) =>
        member.userId === userId ? { ...member, role: "admin" } : member
      );

      await updateDoc(groupRef, { members: updatedMembers });
      members.value = updatedMembers;
    };

    const removeMember = async (userId) => {
      if (!isAdmin.value) return;

      const groupRef = doc(db, "groups", route.params.groupId);
      const updatedMembers = members.value.filter(
        (member) => member.userId !== userId
      );

      await updateDoc(groupRef, { members: updatedMembers });
      members.value = updatedMembers;
    };

    const getUserName = (userId) => {
      const member = members.value.find((member) => member.userId === userId);
      return member
        ? member.name || member.email
        : `Unbekanntes Mitglied (${userId})`;
    };

    const copyGroupId = () => {
      navigator.clipboard.writeText(groupId.value).then(() => {
        alert("Gruppen-ID wurde kopiert!");
      });
    };

    const goBack = () => {
      router.push("/groups");
    };

    const navigateTo = (page) => {
      router.push(`/group/${route.params.groupId}/${page}`);
    };

    onMounted(() => {
      loadGroupDetails();
    });

    return {
      groupName,
      groupId,
      members,
      isAdmin,
      currentUserId,
      newMemberEmailOrUsername,
      errorDialog,
      errorMessage,
      getUserName,
      getMemberAvatar,
      addMember,
      promoteToAdmin,
      removeMember,
      leaveGroup,
      copyGroupId,
      goBack,
      navigateTo,
      groupOptions,
      expandGroupId,
      expandMembers,
      expandAddMember,
    };
  },
};
</script>

<style scoped>
.q-pa-md {
  padding: 16px;
}

.q-mb-md {
  margin-bottom: 16px;
}

.q-mt-md {
  margin-top: 16px;
}

.q-toolbar-title {
  font-weight: bold;
  color: var(--q-primary);
}
</style>
