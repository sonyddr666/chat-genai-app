export interface User {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'typing';
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string; // Text content
  image?: string; // Base64 or URL
  timestamp: number;
  isAiGenerated?: boolean;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'ai_assistant';
  name: string;
  participants: User[];
  lastMessage?: string;
  lastMessageTimestamp?: number;
  unreadCount?: number;
}

export interface AiSessionConfig {
  thinkingLevel: 'low' | 'high';
  temperature: number;
}