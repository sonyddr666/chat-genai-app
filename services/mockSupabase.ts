import { Conversation, Message, User } from "../types";

// Mock Data
const CURRENT_USER: User = {
  id: 'user-me',
  name: 'Alex Developer',
  avatar: 'https://picsum.photos/200/200',
  status: 'online'
};

const GEMINI_BOT: User = {
  id: 'gemini-bot',
  name: 'Gemini 3 Flash',
  avatar: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Google_Gemini_logo.svg', // Placeholder or generic AI icon
  status: 'online'
};

const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-ai',
    type: 'ai_assistant',
    name: 'Gemini Assistant',
    participants: [CURRENT_USER, GEMINI_BOT],
    lastMessage: 'Ready to help with your tasks.',
    lastMessageTimestamp: Date.now(),
  },
  {
    id: 'conv-1',
    type: 'direct',
    name: 'Sarah Design',
    participants: [CURRENT_USER, { id: 'user-2', name: 'Sarah Design', avatar: 'https://picsum.photos/201/201', status: 'online' }],
    lastMessage: 'Can you send the updated mockups?',
    lastMessageTimestamp: Date.now() - 3600000,
    unreadCount: 2,
  },
  {
    id: 'conv-2',
    type: 'group',
    name: 'Project Alpha',
    participants: [CURRENT_USER, { id: 'user-3', name: 'Mike PM', avatar: 'https://picsum.photos/202/202', status: 'offline' }],
    lastMessage: 'Meeting rescheduled to 3 PM.',
    lastMessageTimestamp: Date.now() - 86400000,
  }
];

const INITIAL_MESSAGES: Record<string, Message[]> = {
  'conv-ai': [
    { id: 'm-ai-0', conversationId: 'conv-ai', senderId: 'gemini-bot', content: 'Hello! I am Gemini 3 Flash, your personal assistant. How can I help you today?', timestamp: Date.now(), isAiGenerated: true }
  ],
  'conv-1': [
    { id: 'm-1-1', conversationId: 'conv-1', senderId: 'user-2', content: 'Hey Alex!', timestamp: Date.now() - 3605000 },
    { id: 'm-1-2', conversationId: 'conv-1', senderId: 'user-2', content: 'Can you send the updated mockups?', timestamp: Date.now() - 3600000 }
  ],
  'conv-2': [
     { id: 'm-2-1', conversationId: 'conv-2', senderId: 'user-3', content: 'Meeting rescheduled to 3 PM.', timestamp: Date.now() - 86400000 }
  ]
};

// Simulation Service
export const mockSupabase = {
  auth: {
    getUser: () => CURRENT_USER,
    signIn: async (email: string) => {
      await new Promise(r => setTimeout(r, 800));
      // For demo, we always return the same user but maybe update the name based on email
      const user = { ...CURRENT_USER, name: email.split('@')[0] || 'User' };
      return { user, error: null };
    }
  },
  db: {
    getConversations: async (): Promise<Conversation[]> => {
      // Simulate network delay
      await new Promise(r => setTimeout(r, 400));
      return INITIAL_CONVERSATIONS;
    },
    getMessages: async (conversationId: string): Promise<Message[]> => {
      await new Promise(r => setTimeout(r, 200));
      return INITIAL_MESSAGES[conversationId] || [];
    },
    sendMessage: async (conversationId: string, content: string, image?: string): Promise<Message> => {
      await new Promise(r => setTimeout(r, 300));
      const newMessage: Message = {
        id: `msg-${Date.now()}`,
        conversationId,
        senderId: CURRENT_USER.id,
        content,
        image,
        timestamp: Date.now(),
        isAiGenerated: false
      };
      return newMessage;
    }
  }
};