<template>
  <q-page class="q-pa-md">
    <q-toolbar class="bg-primary text-white shadow-4">
      <q-btn flat dense round icon="arrow_back" @click="goBack" />
      <q-toolbar-title>Einkaufsliste</q-toolbar-title>
      <q-btn
        flat
        dense
        icon="add"
        label="Neuen Einkauf hinzufügen"
        class="q-ml-auto"
        @click="openShoppingDialog"
      />
    </q-toolbar>

    <!-- Suchfeld für Einkäufe -->
    <q-card flat bordered class="q-mb-lg shadow-2">
      <q-card-section>
        <q-input
          v-model="searchQuery"
          label="Artikel oder Käufer suchen"
          outlined
          dense
          clearable
          prepend-icon="search"
          class="q-pa-sm q-rounded"
        />
      </q-card-section>
    </q-card>

    <!-- Schuldenübersicht -->
    <q-card class="q-pa-md q-mb-md shadow-3 q-rounded">
      <q-card-section>
        <div class="text-h6">Schuldenübersicht</div>
        <q-list>
          <q-item v-for="(debt, userId) in debts" :key="userId" class="q-py-xs">
            <q-item-section>
              <q-item-label>
                {{ getUserName(userId) }} schuldet insgesamt:
                <span :class="debtClass(debt)">
                  {{ formatDebt(debt) }}
                </span>
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>

    <!-- Dialog für das Einkaufsformular -->
    <q-dialog v-model="shoppingDialog">
      <q-card flat bordered class="q-pa-md q-rounded shadow-3">
        <q-card-section>
          <div class="text-h6 text-primary q-mb-md">
            {{ editMode ? "Einkauf bearbeiten" : "Neuen Einkauf hinzufügen" }}
          </div>

          <!-- Neues Grid-Layout für das Formular -->
          <q-form>
            <q-row>
              <!-- Artikel -->
              <q-col :cols="12" :md="6">
                <q-input
                  v-model="newShopping.item"
                  label="Artikel"
                  outlined
                  dense
                  class="q-pa-xs q-mb-md q-rounded"
                  :error="!newShopping.item && showValidation"
                  error-message="Artikelname erforderlich"
                />
              </q-col>

              <!-- Betrag -->
              <q-col :cols="12" :md="6">
                <q-input
                  v-model="newShopping.amount"
                  type="number"
                  label="Betrag (€)"
                  outlined
                  dense
                  class="q-pa-xs q-mb-md q-rounded"
                  :error="newShopping.amount <= 0 && showValidation"
                  error-message="Betrag muss größer als 0 sein"
                />
              </q-col>

              <!-- Käufer auswählen -->
              <q-col :cols="12" :md="6">
                <q-select
                  v-model="newShopping.buyer"
                  :options="memberIds"
                  label="Wer hat eingekauft?"
                  outlined
                  dense
                  class="q-pa-xs q-mb-md q-rounded"
                  :error="!newShopping.buyer && showValidation"
                  error-message="Käufer auswählen"
                />
              </q-col>

              <!-- Teilnehmer auswählen -->
              <q-col :cols="12" :md="6">
                <q-select
                  v-model="newShopping.participants"
                  :options="memberIds"
                  label="Wer teilt die Kosten?"
                  outlined
                  dense
                  multiple
                  class="q-pa-xs q-mb-md q-rounded"
                  :error="
                    newShopping.participants.length === 0 && showValidation
                  "
                  error-message="Mindestens ein Teilnehmer"
                />
              </q-col>
            </q-row>

            <!-- Speichern-Button -->
            <q-btn
              label="Speichern"
              @click="validateAndSaveShopping"
              class="q-mt-lg full-width q-rounded"
              color="primary"
              :disable="isSaving"
              dense
              icon="save"
            />
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Einkaufsliste als Expansion-Komponente mit Farbe -->
    <q-list class="q-mb-md">
      <transition-group name="fade" tag="div">
        <q-expansion-item
          v-for="shopping in filteredShoppingList"
          :key="shopping.id"
          expand-separator
          icon="shopping_cart"
          :label="shopping.item"
          :header-caption="`Gekauft von: ${getUserName(shopping.buyer)}`"
          :header-class="'bg-primary text-white'"
        >
          <q-card-section class="row items-center">
            <q-avatar size="lg" class="q-mr-md shadow-2">
              <img :src="getUserAvatar(shopping.buyer)" />
            </q-avatar>
            <div class="col">
              <q-item-label caption>
                Aufgeteilt auf: {{ shopping.participants.length }} Personen ({{
                  getParticipantsNames(shopping.participants)
                }})
              </q-item-label>
              <q-item-label caption>
                Datum: {{ formatTimestamp(shopping.timestamp) }}
              </q-item-label>
              <q-item-label caption>
                Kosten pro Person:
                <span class="text-positive">
                  {{ calculateCostPerPerson(shopping) }}€
                </span>
              </q-item-label>
              <!-- Neu: Anzeige, welcher Benutzer wie viel bezahlt hat -->
              <q-item-label caption>
                Gekauft von: {{ getUserName(shopping.buyer) }} für insgesamt:
                <span class="text-bold">{{ shopping.amount }}€</span>
              </q-item-label>
            </div>
            <q-item-section side class="row">
              <q-btn
                flat
                icon="edit"
                color="primary"
                @click="editShopping(shopping)"
                dense
              />
              <q-btn
                flat
                icon="delete"
                color="negative"
                @click="confirmDeleteShopping(shopping)"
                dense
              />
            </q-item-section>
          </q-card-section>
        </q-expansion-item>
      </transition-group>
    </q-list>

    <!-- Bestätigungsdialog zum Löschen -->
    <q-dialog v-model="deleteDialog">
      <q-card>
        <q-card-section>
          <div class="text-h6">Einkauf löschen</div>
          <p v-if="shoppingToDelete">
            Möchtest du den Einkauf
            <strong>{{ shoppingToDelete.item }}</strong> für
            <strong>{{ shoppingToDelete.amount }}€</strong> wirklich löschen?
          </p>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            flat
            label="Abbrechen"
            color="primary"
            @click="deleteDialog = false"
          />
          <q-btn
            flat
            label="Löschen"
            color="negative"
            @click="deleteShopping"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Snackbar für Erfolg -->
    <q-dialog v-model="successDialog" persistent>
      <q-card>
        <q-card-section class="text-center">
          <q-icon name="check_circle" color="green" size="3rem" />
          <div class="text-h6 q-mt-md">{{ successMessage }}</div>
        </q-card-section>
        <q-card-actions align="center">
          <q-btn
            flat
            label="OK"
            color="primary"
            @click="successDialog = false"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { db } from "../../firebase";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

export default {
  setup() {
    const newShopping = ref({
      item: "",
      amount: 0,
      buyer: "",
      participants: [],
    });
    const shoppingToEdit = ref(null);
    const shoppingList = ref([]);
    const members = ref([]);
    const memberIds = ref([]);
    const debts = ref({});
    const searchQuery = ref("");
    const route = useRoute();
    const router = useRouter();
    const groupId = ref(route.params.groupId);
    const editMode = ref(false);
    const isSaving = ref(false);
    const deleteDialog = ref(false);
    const successDialog = ref(false);
    const successMessage = ref("");
    const showValidation = ref(false);
    const shoppingToDelete = ref(null);
    const shoppingDialog = ref(false);

    const loadMembersAndShoppingList = async () => {
      const groupDoc = await getDoc(doc(db, "groups", groupId.value));
      if (groupDoc.exists()) {
        const groupData = groupDoc.data();
        members.value = groupData.members;

        memberIds.value = groupData.members.map((member) => ({
          label: member.name || member.email,
          value: member.userId,
        }));
      }

      const shoppingCollection = collection(
        db,
        `groups/${groupId.value}/shoppingList`
      );
      const shoppingSnapshot = await getDocs(shoppingCollection);
      shoppingList.value = shoppingSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      calculateDebts();
    };

    const calculateDebts = () => {
      debts.value = {};

      shoppingList.value.forEach((shopping) => {
        const participantCount = shopping.participants.length;
        const costPerPerson = shopping.amount / participantCount;

        shopping.participants.forEach((participant) => {
          if (!debts.value[participant]) {
            debts.value[participant] = 0;
          }

          if (participant !== shopping.buyer) {
            debts.value[participant] -= costPerPerson;
            debts.value[shopping.buyer] += costPerPerson;
          }
        });
      });
    };

    const getParticipantsNames = (participantIds) => {
      return participantIds
        .map((id) => {
          const member = members.value.find((m) => m.userId === id);
          return member ? member.name : `Unbekannt (${id})`;
        })
        .join(", ");
    };

    const validateAndSaveShopping = async () => {
      showValidation.value = true;

      if (
        newShopping.value.item &&
        newShopping.value.amount > 0 &&
        newShopping.value.buyer &&
        newShopping.value.participants.length > 0
      ) {
        isSaving.value = true;

        if (editMode.value && shoppingToEdit.value) {
          await updateDoc(
            doc(
              db,
              `groups/${groupId.value}/shoppingList`,
              shoppingToEdit.value.id
            ),
            {
              item: newShopping.value.item,
              amount: newShopping.value.amount,
              buyer: newShopping.value.buyer.value,
              participants: newShopping.value.participants.map((p) => p.value),
              timestamp: shoppingToEdit.value.timestamp,
            }
          );
          successMessage.value = "Einkauf erfolgreich bearbeitet!";
        } else {
          await addDoc(collection(db, `groups/${groupId.value}/shoppingList`), {
            item: newShopping.value.item,
            amount: newShopping.value.amount,
            buyer: newShopping.value.buyer.value,
            participants: newShopping.value.participants.map((p) => p.value),
            timestamp: new Date(),
          });
          successMessage.value = "Einkauf erfolgreich gespeichert!";
        }

        successDialog.value = true;

        resetForm();
        loadMembersAndShoppingList();
        isSaving.value = false;
        showValidation.value = false;
        shoppingDialog.value = false;
      }
    };

    const editShopping = (shopping) => {
      newShopping.value = {
        ...shopping,
        buyer: memberIds.value.find((m) => m.value === shopping.buyer),
        participants: shopping.participants.map((id) =>
          memberIds.value.find((m) => m.value === id)
        ),
      };
      shoppingToEdit.value = shopping;
      editMode.value = true;
      shoppingDialog.value = true;
    };

    const confirmDeleteShopping = (shopping) => {
      shoppingToDelete.value = shopping;
      deleteDialog.value = true;
    };

    const deleteShopping = async () => {
      if (shoppingToDelete.value) {
        try {
          await deleteDoc(
            doc(
              db,
              `groups/${groupId.value}/shoppingList`,
              shoppingToDelete.value.id
            )
          );
          shoppingToDelete.value = null;
          deleteDialog.value = false;
          loadMembersAndShoppingList();
        } catch (error) {
          console.error("Fehler beim Löschen des Einkaufs:", error);
        }
      }
    };

    const openShoppingDialog = () => {
      resetForm();
      shoppingDialog.value = true;
    };

    const resetForm = () => {
      newShopping.value = {
        item: "",
        amount: 0,
        buyer: "",
        participants: [],
      };
      editMode.value = false;
    };

    const calculateCostPerPerson = (shopping) => {
      const participantCount = shopping.participants.length;
      return participantCount > 0
        ? (shopping.amount / participantCount).toFixed(2)
        : 0;
    };

    const getUserName = (userId) => {
      const member = members.value.find((member) => member.userId === userId);
      return member ? member.name : `Unbekanntes Mitglied (${userId})`;
    };

    const formatTimestamp = (timestamp) => {
      if (timestamp instanceof Date) {
        return timestamp.toLocaleString();
      } else if (timestamp && typeof timestamp.toDate === "function") {
        return timestamp.toDate().toLocaleString();
      } else {
        return "Kein Datum verfügbar";
      }
    };

    const formatDebt = (debt) => {
      if (debt > 0) {
        return `+${debt.toFixed(2)}€`;
      }
      return `${debt.toFixed(2)}€`;
    };

    const debtClass = (debt) => {
      return debt >= 0 ? "text-green" : "text-red";
    };

    const filteredShoppingList = computed(() => {
      const sortedList = [...shoppingList.value].sort(
        (a, b) => b.timestamp - a.timestamp
      );
      if (!searchQuery.value) {
        return sortedList;
      }

      return sortedList.filter((shopping) => {
        const buyerName = getUserName(shopping.buyer).toLowerCase();
        const itemName = shopping.item.toLowerCase();
        const query = searchQuery.value.toLowerCase();

        return (
          itemName.includes(query) ||
          buyerName.includes(query) ||
          shopping.participants.some((participant) =>
            getUserName(participant).toLowerCase().includes(query)
          )
        );
      });
    });

    const goBack = () => {
      router.push(`/group/${groupId.value}`);
    };

    onMounted(() => {
      loadMembersAndShoppingList();
    });

    const getUserAvatar = (userId) => {
      // Hier könntest du die Logik hinzufügen, um den Avatar basierend auf dem Benutzer zu holen
      return "/avatars/user.png"; // Standard-Avatar für alle
    };

    return {
      newShopping,
      shoppingList,
      members,
      memberIds,
      validateAndSaveShopping,
      editShopping,
      confirmDeleteShopping,
      deleteShopping,
      calculateCostPerPerson,
      debts,
      getUserName,
      getParticipantsNames,
      goBack,
      formatTimestamp,
      filteredShoppingList,
      resetForm,
      successDialog,
      successMessage,
      isSaving,
      showValidation,
      searchQuery,
      editMode,
      deleteDialog,
      shoppingToDelete,
      shoppingDialog,
      openShoppingDialog,
      getUserAvatar,
      debtClass,
      formatDebt,
      shoppingToEdit, // Hinzugefügt, um den Bearbeitungsmodus zu ermöglichen
    };
  },
};
</script>

<style scoped>
.q-pa-md {
  padding: 16px;
}

.q-mt-sm {
  margin-top: 8px;
}

.q-mt-md {
  margin-top: 16px;
}

.q-mb-sm {
  margin-bottom: 8px;
}

.q-mb-md {
  margin-bottom: 16px;
}

.q-rounded {
  border-radius: 12px;
}

.text-primary {
  color: #007bff;
}

.text-positive {
  color: #21ba45;
}

.text-bold {
  font-weight: bold;
}

.full-width {
  width: 100%;
}

.text-green {
  color: green;
}

.text-red {
  color: red;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter, .fade-leave-to /* .fade-leave-active in <2.1.8 */ {
  opacity: 0;
}

.shadow-2 {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.shadow-3 {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.shadow-4 {
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
}

.search-field {
  background-color: #f9f9f9;
  border: 1px solid #ddd;
}
</style>
