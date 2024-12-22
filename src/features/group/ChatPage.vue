<template>
  <q-page class="q-pa-md">
    <!-- Toolbar für die Chat-Seite -->
    <q-toolbar class="bg-primary text-white shadow-2">
      <q-btn flat dense round icon="arrow_back" @click="goBack" />
      <q-toolbar-title>Gruppen-Chat</q-toolbar-title>
    </q-toolbar>

    <!-- Nachrichtenliste -->
    <div ref="chatContainer" class="chat-container q-pa-sm">
      <div
        v-for="message in sortedMessages"
        :key="message.id"
        class="q-mb-sm"
        :class="{
          'message-right': message.sender === currentUser,
          'message-left': message.sender !== currentUser,
        }"
      >
        <q-item class="message-bubble">
          <q-item-section avatar v-if="message.sender !== currentUser">
            <q-avatar size="sm" rounded>
              <img :src="getUserAvatar(message.sender)" />
            </q-avatar>
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-bold">{{ message.sender }}</q-item-label>
            <q-item-label class="message-content">{{
              message.message
            }}</q-item-label>
            <q-item-label caption class="message-time">{{
              formatTimestamp(message.timestamp)
            }}</q-item-label>
          </q-item-section>
        </q-item>
      </div>
    </div>

    <!-- Eingabefeld für Nachrichten -->
    <q-input
      v-model="newMessage"
      placeholder="Schreibe eine Nachricht..."
      @keyup.enter="sendMessage"
      filled
      class="input-box"
    >
      <template v-slot:append>
        <q-btn flat icon="send" @click="sendMessage" />
      </template>
    </q-input>
  </q-page>
</template>

<script>
import { ref, onMounted, nextTick, computed } from "vue";
import { db, auth } from "../../firebase";
import { collection, addDoc, onSnapshot } from "firebase/firestore";
import { useRoute, useRouter } from "vue-router";

export default {
  setup() {
    const messages = ref([]);
    const newMessage = ref("");
    const route = useRoute();
    const router = useRouter();
    const groupId = ref(route.params.groupId);
    const chatContainer = ref(null);
    const currentUser = ref(
      auth.currentUser.displayName || auth.currentUser.email
    );

    // Nachrichten aus Firebase laden
    const loadMessages = () => {
      const chatCollection = collection(db, `groups/${groupId.value}/chat`);
      onSnapshot(chatCollection, (snapshot) => {
        messages.value = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        nextTick(scrollToBottom); // Scrollen nach unten, wenn Nachrichten geladen sind
      });
    };

    // Nachricht senden
    const sendMessage = async () => {
      if (newMessage.value.trim() === "") return;

      await addDoc(collection(db, `groups/${groupId.value}/chat`), {
        sender: auth.currentUser.displayName || auth.currentUser.email,
        message: newMessage.value,
        timestamp: new Date().toISOString(),
      });

      newMessage.value = ""; // Eingabefeld nach dem Senden leeren
      nextTick(scrollToBottom); // Scrollen nach dem Senden der Nachricht
    };

    // Zeitstempel formatieren
    const formatTimestamp = (timestamp) => {
      return new Date(timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    // Sortiere Nachrichten nach Zeitstempel
    const sortedMessages = computed(() => {
      return [...messages.value].sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      );
    });

    // Scrollt zum Ende des Chat-Containers
    const scrollToBottom = () => {
      if (chatContainer.value) {
        chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
      }
    };

    // Avatar eines Benutzers anzeigen
    const getUserAvatar = (sender) => {
      // Hier könntest du die Logik hinzufügen, um den Avatar basierend auf dem Benutzer zu holen
      return "/avatars/user.png"; // Standard-Avatar für alle
    };

    // Zurück zur Gruppenübersicht
    const goBack = () => {
      router.push(`/group/${groupId.value}`);
    };

    onMounted(() => {
      loadMessages();
    });

    return {
      messages,
      newMessage,
      sendMessage,
      formatTimestamp,
      goBack,
      chatContainer,
      sortedMessages,
      getUserAvatar,
      currentUser,
    };
  },
};
</script>

<style scoped>
.chat-container {
  max-height: 70vh;
  overflow-y: auto;
  padding-bottom: 16px;
}

.message-left {
  display: flex;
  justify-content: flex-start;
}

.message-right {
  display: flex;
  justify-content: flex-end;
}

.message-bubble {
  max-width: 60%;
  border-radius: 12px;
  padding: 8px 12px;
  background-color: var(--q-primary-light);
}

.message-left .message-bubble {
  background-color: #f1f1f1;
}

.message-right .message-bubble {
  background-color: var(--q-primary);
  color: white;
}

.message-content {
  white-space: pre-wrap;
}

.message-time {
  font-size: 0.75rem;
  opacity: 0.6;
}

.input-box {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8px;
  background-color: white;
  border-top: 1px solid #ddd;
}
</style>
