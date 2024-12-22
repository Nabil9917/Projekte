<template>
  <q-page class="q-pa-md">
    <q-toolbar class="bg-primary text-white">
      <q-btn flat dense round icon="arrow_back" @click="goBack" />
      <q-toolbar-title>Putzplan</q-toolbar-title>
    </q-toolbar>

    <q-list class="q-pa-md">
      <q-expansion-item
        v-for="schedule in cleaningSchedules"
        :key="schedule.id"
        expand-separator
        icon="cleaning_services"
        :label="`${schedule.startDate} - ${schedule.endDate}`"
        header-class="bg-primary text-white"
        v-model="expandCleaningPlan[schedule.id]"
      >
        <q-card-section>
          <div class="row items-center">
            <div class="col">
              <div
                :class="{
                  'text-h6': true,
                  'line-through': checkAllTasksCompleted(schedule),
                }"
              >
                {{ schedule.startDate }} - {{ schedule.endDate }}
              </div>
              <div class="text-caption">Frequenz: {{ schedule.frequency }}</div>
              <div class="text-caption">
                Nächster dran:
                {{
                  getUserName(schedule.members[schedule.currentIndex]?.userId)
                }}
              </div>
              <div class="text-caption">
                Zeitraum: {{ getTaskPeriod(schedule) }}
              </div>
              <ul>
                <li v-for="(task, index) in schedule.tasks" :key="index">
                  <q-checkbox
                    v-model="task.completed"
                    @click="checkTaskCompletion(schedule)"
                  />
                  <span>{{ task.name }}</span>
                </li>
              </ul>
            </div>
            <q-btn
              flat
              :color="checkAllTasksCompleted(schedule) ? 'warning' : 'positive'"
              :icon="checkAllTasksCompleted(schedule) ? 'undo' : 'check'"
              @click="markAllTasksCompleted(schedule)"
            />
            <q-btn
              flat
              color="primary"
              icon="edit"
              @click="editSchedule(schedule)"
            />
            <q-btn
              flat
              color="negative"
              icon="delete"
              @click="confirmDeleteSchedule(schedule.id)"
            />
          </div>
        </q-card-section>
      </q-expansion-item>
    </q-list>

    <!-- Button zum Erstellen eines neuen Putzplans -->
    <q-btn
      @click="openScheduleDialog"
      label="Neuen Putzplan erstellen"
      color="primary"
      class="q-mt-md full-width"
      icon="add"
    />

    <!-- Dialog zum Erstellen oder Bearbeiten von Putzplänen -->
    <q-dialog v-model="scheduleDialog" persistent>
      <q-card>
        <q-card-section>
          <div class="text-h6">
            {{ isEditing ? "Putzplan bearbeiten" : "Neuen Putzplan erstellen" }}
          </div>
        </q-card-section>

        <q-card-section>
          <div v-for="(task, index) in tasks" :key="index" class="row">
            <q-input
              v-model="task.name"
              label="Aufgabe"
              dense
              outlined
              class="col"
            />
            <q-btn
              flat
              icon="add"
              @click="addTaskField"
              v-if="index === tasks.length - 1"
            />
            <q-btn
              flat
              icon="delete"
              @click="removeTaskField(index)"
              v-if="tasks.length > 1"
            />
          </div>

          <q-input
            v-model="startDate"
            type="date"
            label="Startdatum"
            filled
            class="q-mt-sm"
            required
          />
          <q-input
            v-model="endDate"
            type="date"
            label="Enddatum"
            filled
            class="q-mt-sm"
            required
          />

          <q-select
            v-model="frequency"
            :options="frequencyOptions"
            label="Frequenz"
            filled
            class="q-mt-sm"
          />

          <q-select
            v-model="selectedMembers"
            :options="groupMembers"
            label="Mitglieder auswählen"
            multiple
            option-label="name"
            option-value="userId"
            use-input
            input-debounce="0"
            filled
            outlined
            class="q-mt-sm"
          />

          <!-- Mitgliederreihenfolge festlegen -->
          <div v-if="selectedMembers.length > 0">
            <q-list>
              <q-item v-for="(member, index) in selectedMembers" :key="index">
                <q-item-section>{{ member.name }}</q-item-section>
                <q-item-section side>
                  <q-btn flat icon="arrow_upward" @click="moveUp(index)" />
                  <q-btn flat icon="arrow_downward" @click="moveDown(index)" />
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            flat
            label="Abbrechen"
            @click="scheduleDialog = false"
            color="negative"
          />
          <q-btn flat label="Speichern" color="primary" @click="saveSchedule" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Bestätigungsdialog für das Löschen eines Putzplans -->
    <q-dialog v-model="deleteDialog" persistent>
      <q-card>
        <q-card-section>
          <div class="text-h6">Löschen bestätigen</div>
        </q-card-section>

        <q-card-section>
          <p>
            Bist du sicher, dass du diesen Putzplan löschen möchtest? Diese
            Aktion kann nicht rückgängig gemacht werden.
          </p>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            flat
            label="Abbrechen"
            @click="deleteDialog = false"
            color="primary"
          />
          <q-btn
            flat
            label="Löschen"
            color="negative"
            @click="deleteSchedule"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { db } from "../../firebase";
import {
  collection,
  doc,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { addDays, addWeeks, addMonths, format } from "date-fns";

export default {
  name: "CleaningSchedulePage",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const groupId = route.params.groupId;
    const tasks = ref([{ name: "", completed: false }]);
    const startDate = ref("");
    const endDate = ref("");
    const frequency = ref("");
    const frequencyOptions = ref(["Täglich", "Wöchentlich", "Monatlich"]);
    const selectedMembers = ref([]);
    const groupMembers = ref([]);
    const cleaningSchedules = ref([]);
    const scheduleDialog = ref(false);
    const deleteDialog = ref(false);
    const confirmCompleteDialog = ref(false);
    const isEditing = ref(false); // Define isEditing to control edit mode
    const currentSchedule = ref(null);
    const selectedScheduleForCompletion = ref(null);
    const expandCleaningPlan = ref({}); // Die expandCleaningPlan-Variable wird hier definiert

    // Funktion zum Öffnen des Dialogs für das Erstellen eines neuen Putzplans
    const openScheduleDialog = () => {
      tasks.value = [{ name: "", completed: false }];
      startDate.value = "";
      endDate.value = "";
      frequency.value = "";
      selectedMembers.value = [];
      isEditing.value = false; // Set editing mode to false for new schedules
      scheduleDialog.value = true; // Dialog anzeigen
    };

    // Funktion zur Namensanzeige eines Mitglieds basierend auf der userId
    const getUserName = (userId) => {
      const member = groupMembers.value.find((m) => m.userId === userId);
      return member ? member.name : "Unbekannt";
    };

    // Methode zur Berechnung des Zeitraums basierend auf der Frequenz
    const getTaskPeriod = (schedule) => {
      const start = new Date(schedule.startDate);
      let periodEnd;

      if (schedule.frequency === "Täglich") {
        periodEnd = addDays(start, 1);
      } else if (schedule.frequency === "Wöchentlich") {
        periodEnd = addWeeks(start, 1);
      } else if (schedule.frequency === "Monatlich") {
        periodEnd = addMonths(start, 1);
      } else {
        periodEnd = start;
      }

      return `${format(start, "dd.MM.yyyy")} - ${format(
        periodEnd,
        "dd.MM.yyyy"
      )}`;
    };

    // Laden der Gruppenmitglieder aus Firebase
    const loadGroupMembers = async () => {
      const groupDoc = await getDoc(doc(db, "groups", groupId));
      if (groupDoc.exists()) {
        groupMembers.value = groupDoc.data().members;
      }
    };

    // Laden der Putzpläne aus Firebase
    const loadCleaningSchedules = async () => {
      const querySnapshot = await getDocs(
        collection(db, "groups", groupId, "cleaningSchedules")
      );
      cleaningSchedules.value = querySnapshot.docs.map((doc) => {
        const scheduleData = doc.data();
        expandCleaningPlan.value[doc.id] = true; // Initialisiere die expandCleaningPlan-Variable für jede Schedule
        return { id: doc.id, ...scheduleData };
      });
    };

    // Überprüfung, ob alle Aufgaben abgeschlossen sind
    const checkAllTasksCompleted = (schedule) => {
      return schedule.tasks.every((t) => t.completed);
    };

    // Hinzufügen eines neuen Aufgabenfelds
    const addTaskField = () => {
      tasks.value.push({ name: "", completed: false });
    };

    // Entfernen eines Aufgabenfelds
    const removeTaskField = (index) => {
      tasks.value.splice(index, 1);
    };

    // Mitglieder in der Liste nach oben verschieben
    const moveUp = (index) => {
      if (index > 0) {
        const temp = selectedMembers.value[index - 1];
        selectedMembers.value[index - 1] = selectedMembers.value[index];
        selectedMembers.value[index] = temp;
      }
    };

    // Mitglieder in der Liste nach unten verschieben
    const moveDown = (index) => {
      if (index < selectedMembers.value.length - 1) {
        const temp = selectedMembers.value[index + 1];
        selectedMembers.value[index + 1] = selectedMembers.value[index];
        selectedMembers.value[index] = temp;
      }
    };

    // Speichern eines neuen oder bearbeiteten Putzplans
    const saveSchedule = async () => {
      if (isEditing.value) {
        await updateDoc(
          doc(
            db,
            "groups",
            groupId,
            "cleaningSchedules",
            currentSchedule.value.id
          ),
          {
            tasks: tasks.value,
            startDate: startDate.value,
            endDate: endDate.value,
            frequency: frequency.value,
            members: selectedMembers.value,
          }
        );
      } else {
        await addDoc(collection(db, "groups", groupId, "cleaningSchedules"), {
          tasks: tasks.value,
          startDate: startDate.value,
          endDate: endDate.value,
          frequency: frequency.value,
          members: selectedMembers.value,
          currentIndex: 0,
        });
      }
      scheduleDialog.value = false;
      loadCleaningSchedules();
    };

    // Bearbeiten eines bestehenden Putzplans
    const editSchedule = (schedule) => {
      isEditing.value = true;
      currentSchedule.value = schedule;
      tasks.value = [...schedule.tasks];
      startDate.value = schedule.startDate;
      endDate.value = schedule.endDate;
      frequency.value = schedule.frequency;
      selectedMembers.value = schedule.members;
      scheduleDialog.value = true; // Dialog anzeigen
    };

    // Überprüfung der Aufgaben und Dialog anzeigen, bevor das Fälligkeitsdatum aktualisiert wird
    const checkTaskCompletion = (schedule) => {
      const allCompleted = schedule.tasks.every((task) => task.completed);
      if (allCompleted) {
        selectedScheduleForCompletion.value = schedule;
        confirmCompleteDialog.value = true;
      }
    };

    const confirmCompletion = async () => {
      const schedule = selectedScheduleForCompletion.value;
      if (!schedule) return;

      schedule.currentIndex =
        (schedule.currentIndex + 1) % schedule.members.length;
      schedule.tasks.forEach((t) => (t.completed = false));
      updateDueDate(schedule);

      await updateDoc(
        doc(db, "groups", groupId, "cleaningSchedules", schedule.id),
        {
          tasks: schedule.tasks,
          currentIndex: schedule.currentIndex,
          startDate: schedule.startDate,
          endDate: schedule.endDate,
        }
      );

      confirmCompleteDialog.value = false;
      loadCleaningSchedules();
    };

    const markAllTasksCompleted = async (schedule) => {
      schedule.tasks.forEach((task) => {
        task.completed = true;
      });
      checkTaskCompletion(schedule);

      await updateDoc(
        doc(db, "groups", groupId, "cleaningSchedules", schedule.id),
        {
          tasks: schedule.tasks,
          startDate: schedule.startDate,
          endDate: schedule.endDate,
        }
      );
    };

    const updateDueDate = (schedule) => {
      const currentStartDate = new Date(schedule.startDate);

      if (schedule.frequency === "Täglich") {
        schedule.startDate = format(addDays(currentStartDate, 1), "yyyy-MM-dd");
        schedule.endDate = format(addDays(currentStartDate, 1), "yyyy-MM-dd");
      } else if (schedule.frequency === "Wöchentlich") {
        const nextWeekStart = addDays(currentStartDate, 7);
        schedule.startDate = format(nextWeekStart, "yyyy-MM-dd");
        schedule.endDate = format(addDays(nextWeekStart, 7), "yyyy-MM-dd");
      } else if (schedule.frequency === "Monatlich") {
        const nextMonthStart = addMonths(currentStartDate, 1);
        schedule.startDate = format(nextMonthStart, "yyyy-MM-dd");
        schedule.endDate = format(addMonths(nextMonthStart, 1), "yyyy-MM-dd");
      }
    };

    // Bestätigungsdialog für das Löschen eines Putzplans anzeigen
    const confirmDeleteSchedule = (scheduleId) => {
      currentSchedule.value = scheduleId;
      deleteDialog.value = true;
    };

    // Löschen eines Putzplans
    const deleteSchedule = async () => {
      await deleteDoc(
        doc(db, "groups", groupId, "cleaningSchedules", currentSchedule.value)
      );
      deleteDialog.value = false;
      loadCleaningSchedules();
    };

    const goBack = () => {
      router.back();
    };

    onMounted(() => {
      loadGroupMembers();
      loadCleaningSchedules();
    });

    return {
      tasks,
      startDate,
      endDate,
      frequency,
      frequencyOptions,
      selectedMembers,
      groupMembers,
      cleaningSchedules,
      scheduleDialog,
      deleteDialog,
      confirmCompleteDialog,
      isEditing,
      currentSchedule,
      selectedScheduleForCompletion,
      openScheduleDialog,
      expandCleaningPlan, // Rückgabe der expandCleaningPlan-Variable
      addTaskField,
      removeTaskField,
      saveSchedule,
      editSchedule,
      moveUp,
      moveDown,
      checkTaskCompletion,
      confirmCompletion,
      markAllTasksCompleted,
      confirmDeleteSchedule,
      deleteSchedule,
      getUserName,
      getTaskPeriod,
      checkAllTasksCompleted,
      goBack,
    };
  },
};
</script>

<style scoped>
.q-mt-sm {
  margin-top: 8px;
}

.q-mt-lg {
  margin-top: 16px;
}

.q-pa-md {
  padding: 16px;
}

.q-mb-md {
  margin-bottom: 16px;
}

.full-width {
  width: 100%;
}

.line-through {
  text-decoration: line-through;
}
</style>
