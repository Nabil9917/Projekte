<template>
  <q-page class="q-pa-md">
    <div>
      <h1>WG Kalender</h1>

      <!-- Dropdown zur Auswahl der Gruppe -->
      <q-select
        v-model="selectedGroup"
        :options="groups"
        option-value="id"
        option-label="name"
        label="Gruppe auswählen"
        dense
        filled
        class="q-mb-md"
        @update:model-value="loadEvents"
      />

      <!-- Filteroptionen -->
      <div class="q-mb-md">
        <q-select
          v-model="selectedTaskType"
          :options="taskTypeOptions"
          label="Aufgabenart filtern"
          dense
          filled
          class="q-mt-sm"
        />
      </div>

      <!-- Kalender-Komponente -->
      <vue-cal
        v-if="selectedGroup"
        style="height: 600px"
        :events="filteredEvents"
        @cell-click="onDayClick"
        :time="true"
        view="week"
        :event-class="getEventClass"
      ></vue-cal>

      <!-- Kein Kalender sichtbar, wenn keine Gruppe ausgewählt -->
      <div v-else>
        <p>Bitte wähle eine Gruppe aus, um den Kalender anzuzeigen.</p>
      </div>

      <!-- Dialog zur Erstellung von Tasks -->
      <q-dialog v-model="editDialog">
        <q-card>
          <q-card-section>
            <div class="text-h6">Neuen Task hinzufügen</div>
          </q-card-section>

          <q-card-section>
            <q-input v-model="eventTitle" label="Titel" filled />
            <q-input
              v-model="eventDate"
              type="date"
              label="Datum"
              filled
              class="q-mt-sm"
            />
            <q-input
              v-model="eventTime"
              type="time"
              label="Uhrzeit"
              filled
              class="q-mt-sm"
            />
            <q-select
              v-model="recurrence"
              :options="recurrenceOptions"
              label="Wiederholung"
              filled
              class="q-mt-sm"
            />
            <q-input
              v-if="recurrence !== 'Keine'"
              v-model="endDate"
              type="date"
              label="Enddatum der Wiederholung"
              filled
              class="q-mt-sm"
            />
          </q-card-section>

          <q-card-actions align="right">
            <q-btn
              flat
              label="Abbrechen"
              @click="closeEventDialog"
              color="negative"
            />
            <q-btn flat label="Speichern" color="primary" @click="saveEvent" />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script>
import VueCal from "vue-cal";
import "vue-cal/dist/vuecal.css";
import { ref, onMounted, watch } from "vue";
import { db } from "../firebase";
import { collection, getDocs, addDoc, onSnapshot } from "firebase/firestore";
import { auth } from "../firebase";

export default {
  components: { VueCal },
  setup() {
    const selectedGroup = ref(null);
    const groups = ref([]);
    const calendarEvents = ref([]);
    const filteredEvents = ref([]);
    const editDialog = ref(false);
    const eventTitle = ref("");
    const eventDate = ref("");
    const eventTime = ref("");
    const recurrence = ref("Keine");
    const recurrenceOptions = ref([
      "Keine",
      "Täglich",
      "Wöchentlich",
      "Monatlich",
    ]);
    const endDate = ref(""); // Enddatum für die Wiederholung
    const selectedDate = ref(null);

    const daysOfWeek = ref([
      "Sonntag",
      "Montag",
      "Dienstag",
      "Mittwoch",
      "Donnerstag",
      "Freitag",
      "Samstag",
    ]);

    // Filteroptionen
    const selectedTaskType = ref("Alle");
    const taskTypeOptions = ref(["Alle", "Tasks", "Putzpläne"]);

    const colors = {
      task: "blue-event", // Blaue Klasse für Tasks
      cleaning: "green-event", // Grüne Klasse für Putzpläne
      recurring: "orange-event", // Orange Klasse für wiederkehrende Aufgaben
    };

    const loadGroups = async () => {
      const currentUser = auth.currentUser;
      const querySnapshot = await getDocs(collection(db, "groups"));
      groups.value = querySnapshot.docs
        .map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          members: doc.data().members,
        }))
        .filter((group) =>
          group.members.some((member) => member.userId === currentUser.uid)
        );
    };

    const saveEvent = async () => {
      if (
        selectedGroup.value &&
        eventTitle.value &&
        eventDate.value &&
        eventTime.value
      ) {
        const groupId = selectedGroup.value.id;
        const tasksCollection = collection(db, "groups", groupId, "tasks");

        await addDoc(tasksCollection, {
          title: eventTitle.value,
          dueDate: eventDate.value,
          time: eventTime.value,
          recurrence: recurrence.value,
          completed: false,
        });

        // Wenn die Aufgabe eine Wiederholung hat, erstelle alle zukünftigen Instanzen
        if (recurrence.value !== "Keine" && endDate.value) {
          await createRecurringTasks(
            {
              title: eventTitle.value,
              dueDate: eventDate.value,
              time: eventTime.value,
              recurrence: recurrence.value,
            },
            endDate.value
          );
        }

        closeEventDialog(); // Dialog schließen nach Speichern
      }
    };

    const createRecurringTasks = async (task, endDate) => {
      const tasksCollection = collection(db, `groups/${groupId}/tasks`);
      let nextDueDate = new Date(task.dueDate);

      while (nextDueDate <= new Date(endDate)) {
        if (task.recurrence === "Täglich") {
          nextDueDate.setDate(nextDueDate.getDate() + 1);
        } else if (task.recurrence === "Wöchentlich") {
          nextDueDate.setDate(nextDueDate.getDate() + 7);
        } else if (task.recurrence === "Monatlich") {
          nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        }

        await addDoc(tasksCollection, {
          title: task.title,
          dueDate: nextDueDate.toISOString().substr(0, 10), // Nur Datum
          time: task.time,
          recurrence: task.recurrence,
          completed: false,
        });
      }
    };

    const applyFilters = () => {
      filteredEvents.value = calendarEvents.value.filter((event) => {
        let matchesTaskType = true;

        if (selectedTaskType.value === "Tasks" && event.content !== "Task") {
          matchesTaskType = false;
        } else if (
          selectedTaskType.value === "Putzpläne" &&
          event.content !== "Putzplan"
        ) {
          matchesTaskType = false;
        }

        return matchesTaskType;
      });
    };

    const loadEvents = async () => {
      if (selectedGroup.value) {
        const groupId = selectedGroup.value.id;

        const tasksCollection = collection(db, "groups", groupId, "tasks");
        const cleaningScheduleCollection = collection(
          db,
          "groups",
          groupId,
          "cleaningSchedule"
        );

        // Tasks laden
        onSnapshot(tasksCollection, (querySnapshot) => {
          calendarEvents.value = [];

          querySnapshot.docs.forEach((doc) => {
            const task = doc.data();
            const dueDate = new Date(task.dueDate + "T" + task.time);
            calendarEvents.value.push({
              id: doc.id,
              start: dueDate,
              end: new Date(dueDate.getTime() + 60 * 60 * 1000),
              title: `Task: ${task.title}`,
              content: "Task",
              recurrence: task.recurrence,
            });
          });
          applyFilters(); // Filter anwenden
        });

        // Putzpläne laden
        onSnapshot(cleaningScheduleCollection, (querySnapshot) => {
          querySnapshot.docs.forEach((doc) => {
            const schedule = doc.data();
            const taskDay = getTaskDay(schedule);
            calendarEvents.value.push({
              id: doc.id,
              start: taskDay,
              end: new Date(taskDay.getTime() + 60 * 60 * 1000),
              title: `Putzplan: ${schedule.task}`,
              content: "Putzplan",
              recurrence: schedule.recurrence,
            });
          });
          applyFilters(); // Filter anwenden
        });
      } else {
        calendarEvents.value = [];
        filteredEvents.value = [];
      }
    };

    const getTaskDay = (schedule) => {
      const taskDay = new Date();
      const dayOfWeekIndex = daysOfWeek.value.indexOf(schedule.dayOfWeek);
      taskDay.setDate(
        taskDay.getDate() + ((7 + dayOfWeekIndex - taskDay.getDay()) % 7)
      );
      const taskTime = schedule.time.split(":");
      taskDay.setHours(taskTime[0], taskTime[1]);
      return taskDay;
    };

    const getEventClass = (event) => {
      if (event.recurrence && event.recurrence !== "Keine") {
        return colors.recurring; // Orange Klasse für wiederkehrende Aufgaben
      } else if (event.content === "Task") {
        return colors.task; // Blaue Klasse für Tasks
      } else if (event.content === "Putzplan") {
        return colors.cleaning; // Grüne Klasse für Putzpläne
      }

      return "";
    };

    const closeEventDialog = () => {
      eventTitle.value = "";
      eventDate.value = "";
      eventTime.value = "";
      recurrence.value = "Keine";
      endDate.value = ""; // Reset the end date
      editDialog.value = false;
    };

    const openEventDialog = () => {
      eventTitle.value = "";
      eventDate.value = selectedDate.value
        ? selectedDate.value.toISOString().substr(0, 10)
        : "";
      eventTime.value = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      recurrence.value = "Keine";
      endDate.value = ""; // Reset the end date
      editDialog.value = true;
    };

    const onDayClick = (day) => {
      selectedDate.value = new Date(day);
      openEventDialog();
    };

    onMounted(() => {
      loadGroups();
    });

    watch([selectedTaskType], () => {
      applyFilters();
    });

    watch(selectedGroup, () => {
      loadEvents();
    });

    return {
      selectedGroup,
      groups,
      calendarEvents,
      filteredEvents,
      editDialog,
      eventTitle,
      eventDate,
      eventTime,
      recurrence,
      recurrenceOptions,
      endDate,
      saveEvent,
      closeEventDialog,
      openEventDialog,
      loadEvents,
      onDayClick,
      getEventClass,
      selectedTaskType,
      taskTypeOptions,
      daysOfWeek,
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

.vuecal {
  max-width: 100%;
}

.blue-event {
  background-color: #1e90ff;
  color: white;
}

.green-event {
  background-color: #32cd32;
  color: white;
}

.orange-event {
  background-color: #ffa500;
  color: white;
}
</style>
