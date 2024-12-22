<template>
  <q-page class="q-pa-md">
    <q-expansion-item
      expand-separator
      icon="assignment"
      label="Tasks"
      header-class="bg-primary text-white"
      v-model="isExpanded"
    >
      <q-list class="q-pa-md">
        <q-card v-for="task in tasks" :key="task.id" class="q-mb-md" bordered>
          <q-card-section>
            <div class="row items-center">
              <q-checkbox v-model="selectedTasks" :val="task.id" />
              <q-icon name="assignment" class="q-mr-md" />
              <div class="col">
                <div
                  :class="{ 'text-h6': true, 'line-through': task.completed }"
                >
                  {{ task.title }}
                </div>
                <div v-if="task.description" class="text-caption">
                  Beschreibung: {{ task.description }}
                </div>
                <div
                  class="text-caption"
                  :class="
                    getDueDateClass(task.dueDate, task.time, task.completed)
                  "
                >
                  Fällig am: {{ formatDate(task.dueDate) }} um
                  {{ formatTime(task.time) }}
                </div>
                <div class="text-caption">
                  Wiederholung: {{ task.recurrence }}
                </div>
              </div>
              <q-btn
                flat
                :color="task.completed ? 'warning' : 'positive'"
                :icon="task.completed ? 'undo' : 'check'"
                @click="toggleTaskCompletion(task.id, task.completed)"
              />
              <q-btn flat color="primary" icon="edit" @click="editTask(task)" />
              <q-btn
                flat
                color="negative"
                icon="delete"
                @click="confirmDeleteTask(task.id)"
              />
            </div>
          </q-card-section>
        </q-card>
      </q-list>
    </q-expansion-item>

    <!-- Button zum Erstellen einer neuen Aufgabe -->
    <q-btn
      @click="openTaskDialog"
      label="Neue Aufgabe erstellen"
      color="primary"
      class="q-mt-md full-width"
      icon="add"
    />

    <!-- Button zum Markieren mehrerer Aufgaben als erledigt -->
    <q-btn
      v-if="selectedTasks.length > 0"
      @click="markMultipleAsCompleted"
      label="Ausgewählte als erledigt markieren"
      color="positive"
      class="q-mt-md full-width"
      icon="check"
    />

    <!-- Button zum Löschen mehrerer Aufgaben -->
    <q-btn
      v-if="selectedTasks.length > 0"
      @click="confirmDeleteMultipleTasks"
      label="Ausgewählte löschen"
      color="negative"
      class="q-mt-md full-width"
      icon="delete"
    />

    <!-- Dialog zum Erstellen oder Bearbeiten von Aufgaben -->
    <q-dialog v-model="taskDialog" persistent>
      <q-card>
        <q-card-section>
          <div class="text-h6">
            {{ isEditing ? "Aufgabe bearbeiten" : "Neue Aufgabe erstellen" }}
          </div>
        </q-card-section>

        <q-card-section>
          <q-input
            v-model="newTask.title"
            label="Titel"
            filled
            :error="errors.title"
            error-message="Titel ist ein Pflichtfeld"
          />
          <q-input
            v-model="newTask.description"
            label="Beschreibung"
            filled
            class="q-mt-sm"
          />
          <q-input
            v-model="newTask.dueDate"
            type="date"
            label="Fälligkeitsdatum"
            filled
            class="q-mt-sm"
            :error="errors.dueDate"
            error-message="Fälligkeitsdatum ist ein Pflichtfeld"
          />
          <q-input
            v-model="newTask.time"
            type="time"
            label="Uhrzeit"
            filled
            class="q-mt-sm"
            :mask="'HH:mm'"
            :error="errors.time"
            error-message="Uhrzeit ist ein Pflichtfeld"
          />
          <q-checkbox
            v-model="isRecurring"
            label="Wiederholen"
            class="q-mt-sm"
          />
          <q-select
            v-if="isRecurring"
            v-model="newTask.recurrence"
            :options="recurrenceOptions"
            label="Wiederholungsfrequenz"
            filled
            class="q-mt-sm"
          />
          <q-input
            v-if="isRecurring"
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
            @click="taskDialog = false"
            color="negative"
          />
          <q-btn
            flat
            label="Speichern"
            color="primary"
            @click="validateAndSaveTask"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Bestätigungsdialog für das Löschen einer Aufgabe -->
    <q-dialog v-model="deleteDialog" persistent>
      <q-card>
        <q-card-section>
          <div class="text-h6">Löschen bestätigen</div>
        </q-card-section>

        <q-card-section>
          <p>
            Bist du sicher, dass du diese Aufgabe löschen möchtest? Diese Aktion
            kann nicht rückgängig gemacht werden.
          </p>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            flat
            label="Abbrechen"
            @click="deleteDialog = false"
            color="primary"
          />
          <q-btn flat label="Löschen" color="negative" @click="deleteTask" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Bestätigungsdialog für das Löschen mehrerer Aufgaben -->
    <q-dialog v-model="deleteMultipleDialog" persistent>
      <q-card>
        <q-card-section>
          <div class="text-h6">Mehrere Aufgaben löschen bestätigen</div>
        </q-card-section>

        <q-card-section>
          <p>
            Bist du sicher, dass du die ausgewählten Aufgaben löschen möchtest?
            Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            flat
            label="Abbrechen"
            @click="deleteMultipleDialog = false"
            color="primary"
          />
          <q-btn
            flat
            label="Löschen"
            color="negative"
            @click="deleteMultipleTasks"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script>
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { db } from "../../firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";

export default {
  emits: ["tasks-updated"],
  setup(_, { emit }) {
    const router = useRouter();
    const route = useRoute();
    const groupId = route.params.groupId;
    const isExpanded = ref(true); // Hier wird die Expansion standardmäßig auf true gesetzt
    const tasks = ref([]);
    const taskDialog = ref(false);
    const deleteDialog = ref(false);
    const deleteMultipleDialog = ref(false);
    const isEditing = ref(false);
    const selectedTasks = ref([]);
    const newTask = ref({
      title: "",
      description: "",
      dueDate: "",
      time: "",
      recurrence: "Keine",
    });
    const endDate = ref("");
    const recurrenceOptions = ref([
      "Keine",
      "Täglich",
      "Wöchentlich",
      "Monatlich",
    ]);
    const isRecurring = ref(false);
    const editingTaskId = ref(null);
    const taskToDeleteId = ref(null);
    const errors = ref({
      title: false,
      dueDate: false,
      time: false,
    });
    let unsubscribe = null;

    const loadTasks = () => {
      const tasksCollection = collection(db, `groups/${groupId}/tasks`);
      unsubscribe = onSnapshot(tasksCollection, (snapshot) => {
        tasks.value = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        emit("tasks-updated");
      });
    };

    const validateAndSaveTask = () => {
      // Validierung der Pflichtfelder
      errors.value.title = !newTask.value.title;
      errors.value.dueDate = !newTask.value.dueDate;
      errors.value.time = !newTask.value.time;

      if (!errors.value.title && !errors.value.dueDate && !errors.value.time) {
        saveTask(); // Speichern, wenn alles validiert wurde
      }
    };

    const saveTask = async () => {
      const tasksCollection = collection(db, `groups/${groupId}/tasks`);

      if (isEditing.value) {
        const taskRef = doc(tasksCollection, editingTaskId.value);
        await updateDoc(taskRef, {
          title: newTask.value.title,
          description: newTask.value.description,
          dueDate: newTask.value.dueDate,
          time: newTask.value.time,
          recurrence: newTask.value.recurrence,
        });
      } else {
        const taskDoc = await addDoc(tasksCollection, {
          title: newTask.value.title,
          description: newTask.value.description,
          dueDate: newTask.value.dueDate,
          time: newTask.value.time,
          recurrence: newTask.value.recurrence,
          completed: false,
        });

        if (isRecurring.value && endDate.value) {
          await createRecurringTasks(newTask.value, endDate.value);
        }
      }

      taskDialog.value = false;
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
          description: task.description,
          dueDate: nextDueDate.toISOString().substr(0, 10),
          time: task.time,
          recurrence: task.recurrence,
          completed: false,
        });
      }
    };

    const toggleTaskCompletion = async (taskId, completed) => {
      const taskRef = doc(db, `groups/${groupId}/tasks`, taskId);
      await updateDoc(taskRef, {
        completed: !completed,
      });
    };

    const confirmDeleteTask = (taskId) => {
      taskToDeleteId.value = taskId;
      deleteDialog.value = true;
    };

    const deleteTask = async () => {
      if (!taskToDeleteId.value) return;

      const taskRef = doc(db, `groups/${groupId}/tasks`, taskToDeleteId.value);
      await deleteDoc(taskRef);

      deleteDialog.value = false;
      taskToDeleteId.value = null;
    };

    const confirmDeleteMultipleTasks = () => {
      deleteMultipleDialog.value = true;
    };

    const deleteMultipleTasks = async () => {
      const tasksCollection = collection(db, `groups/${groupId}/tasks`);

      await Promise.all(
        selectedTasks.value.map(async (taskId) => {
          const taskRef = doc(tasksCollection, taskId);
          await deleteDoc(taskRef);
        })
      );

      selectedTasks.value = [];
      deleteMultipleDialog.value = false;
    };

    const markMultipleAsCompleted = async () => {
      const tasksCollection = collection(db, `groups/${groupId}/tasks`);

      await Promise.all(
        selectedTasks.value.map(async (taskId) => {
          const taskRef = doc(tasksCollection, taskId);
          const task = tasks.value.find((t) => t.id === taskId);
          await updateDoc(taskRef, {
            completed: !task.completed,
          });
        })
      );

      selectedTasks.value = [];
    };

    const goBack = () => {
      router.push(`/group/${groupId}`);
    };

    const openTaskDialog = () => {
      isEditing.value = false;
      newTask.value = {
        title: "",
        description: "",
        dueDate: "",
        time: new Date().toLocaleTimeString([], {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
        }),
        recurrence: "Keine",
      };
      endDate.value = "";
      isRecurring.value = false;
      taskDialog.value = true;
    };

    const editTask = (task) => {
      isEditing.value = true;
      editingTaskId.value = task.id;
      newTask.value.title = task.title;
      newTask.value.description = task.description;
      newTask.value.dueDate = task.dueDate;
      newTask.value.time = task.time;
      newTask.value.recurrence = task.recurrence;
      taskDialog.value = true;
    };

    const formatDate = (date) => {
      if (!(date instanceof Date)) {
        date = new Date(date);
      }
      return date.toLocaleDateString();
    };

    const formatTime = (time) => {
      const [hours, minutes] = time.split(":");
      return `${hours.padStart(2, "0")}:${minutes}`;
    };

    const getDueDateClass = (dueDate, time, completed) => {
      if (completed) {
        return "";
      }

      const currentDateTime = new Date();
      const taskDateTime = new Date(dueDate + "T" + time);

      return taskDateTime < currentDateTime ? "text-red" : "text-green";
    };

    onMounted(() => {
      loadTasks();
    });

    return {
      tasks,
      selectedTasks,
      taskDialog,
      deleteDialog,
      deleteMultipleDialog,
      newTask,
      endDate,
      recurrenceOptions,
      isRecurring,
      isEditing,
      validateAndSaveTask,
      saveTask,
      confirmDeleteTask,
      deleteTask,
      confirmDeleteMultipleTasks,
      deleteMultipleTasks,
      markMultipleAsCompleted,
      toggleTaskCompletion,
      goBack,
      openTaskDialog,
      editTask,
      formatDate,
      formatTime,
      getDueDateClass,
      errors,
      isExpanded,
    };
  },
};
</script>

<style scoped>
.q-toolbar-title {
  font-weight: bold;
  color: white;
}

.q-pa-md {
  padding: 16px;
}

.q-mb-md {
  margin-bottom: 16px;
}

.q-mt-md {
  margin-top: 16px;
}

.full-width {
  width: 100%;
}

.line-through {
  text-decoration: line-through;
}

.text-red {
  color: red;
}

.text-green {
  color: green;
}
</style>
