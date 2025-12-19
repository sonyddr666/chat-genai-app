import { createClient } from '@supabase/supabase-js';
import { Conversation, Message, User } from '../types';

// Provided Configuration
const SUPABASE_CONFIG = {
  url: 'https://umqfliegxajdsoznpxmb.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtcWZsaWVneGFqZHNvem5weG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwMjAxNTMsImV4cCI6MjA4MTU5NjE1M30.9GmXJ-_--ES-fQmVN5uvm_IYpR6AGCH5hZXgmelRqS0'
};

// Helper function to safely get environment variables
const getEnv = (key: string) => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    // @ts-ignore
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return '';
};

const supabaseUrl = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL') || SUPABASE_CONFIG.url;
const supabaseKey = getEnv('SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_ANON_KEY') || SUPABASE_CONFIG.key;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase URL or Key is missing. Database features will fail.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseKey || 'placeholder-key'
);

const GEMINI_BOT_ID = 'gemini-bot';
const GEMINI_BOT_USER: User = {
  id: GEMINI_BOT_ID,
  name: 'Gemini 3 Flash',
  avatar: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Google_Gemini_logo.svg',
  status: 'online'
};

export const db = {
  /**
   * Ensures the user has a profile in the 'profiles' table.
   */
  upsertProfile: async (user: User) => {
    if (!supabaseUrl) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: user.name,
          avatar_url: user.avatar,
          updated_at: new Date().toISOString(),
        });
      
      if (error) {
        if (error.code === '42501') {
           console.warn('Profile sync skipped due to RLS Policy.');
           return;
        }
        console.error('Error updating profile:', JSON.stringify(error, null, 2));
      }
    } catch (e) {
      console.warn('Exception updating profile:', e);
    }
  },

  /**
   * Search for users by name
   */
  searchUsers: async (query: string, currentUserId: string): Promise<User[]> => {
    if (!supabaseUrl || !query.trim()) return [];

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', currentUserId) // Don't find myself
        .ilike('full_name', `%${query}%`)
        .limit(10);

      if (error) {
        console.error("Error searching users:", error);
        return [];
      }

      return data.map((u: any) => ({
        id: u.id,
        name: u.full_name || 'Unknown',
        avatar: u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${u.id}`,
        status: 'offline' // Presence logic is separate
      }));
    } catch (e) {
      console.error("Search exception:", e);
      return [];
    }
  },

  /**
   * Create or get existing direct conversation
   */
  createDirectConversation: async (currentUserId: string, targetUserId: string): Promise<string | null> => {
    if (!supabaseUrl) return null;

    try {
      // 1. Check if conversation already exists (Naive client-side check is safest without complex SQL functions)
      // fetch all my conversations
      const myConvs = await db.getConversations(currentUserId);
      const existing = myConvs.find(c => 
        c.type === 'direct' && 
        c.participants.some(p => p.id === targetUserId)
      );

      if (existing) return existing.id;

      // 2. Create new conversation
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .insert({ type: 'direct', name: 'Direct Chat' }) // Name is ignored for direct chats in UI usually
        .select()
        .single();

      if (convError || !convData) {
        console.error("Error creating conversation:", convError);
        return null;
      }

      // 3. Add participants
      const participants = [
        { conversation_id: convData.id, user_id: currentUserId },
        { conversation_id: convData.id, user_id: targetUserId }
      ];

      const { error: partError } = await supabase
        .from('conversation_participants')
        .insert(participants);

      if (partError) {
        console.error("Error adding participants:", partError);
        return null;
      }

      return convData.id;
    } catch (e) {
      console.error("Create conversation exception:", e);
      return null;
    }
  },

  /**
   * Fetches conversations.
   */
  getConversations: async (userId: string): Promise<Conversation[]> => {
    if (!supabaseUrl) return [];

    try {
      const { data: participations, error: partError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId);

      if (partError) {
        console.error('Error fetching participations:', JSON.stringify(partError, null, 2));
        return [];
      }

      const conversationIds = participations.map(p => p.conversation_id);

      if (conversationIds.length === 0) {
        const aiConv = await db.ensureAiConversation(userId);
        return aiConv ? [aiConv] : [];
      }

      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select(`
          *,
          participants:conversation_participants(
            user:profiles(*)
          )
        `)
        .in('id', conversationIds)
        .order('created_at', { ascending: false });

      if (convError) {
        console.error('Error fetching conversations:', JSON.stringify(convError, null, 2));
        return [];
      }

      const formattedConversations: Conversation[] = convData.map((c: any) => {
        let participants: User[] = c.participants
          .map((p: any) => p.user ? ({
            id: p.user.id,
            name: p.user.full_name || 'Unknown',
            avatar: p.user.avatar_url || '',
            status: 'offline'
          }) : null)
          .filter(Boolean);

        let type = c.type;
        if (c.name === 'Gemini Assistant') {
          type = 'ai_assistant';
          if (!participants.find((p: User) => p.id === GEMINI_BOT_ID)) {
            participants.push(GEMINI_BOT_USER);
          }
        }

        return {
          id: c.id,
          type: type,
          name: c.name || (type === 'ai_assistant' ? 'Gemini Assistant' : 'Chat'),
          participants,
          lastMessage: '...', 
          lastMessageTimestamp: new Date(c.created_at).getTime(),
        };
      });
      
      const hasAi = formattedConversations.find(c => c.type === 'ai_assistant');
      if (!hasAi) {
         const aiConv = await db.ensureAiConversation(userId);
         if (aiConv) formattedConversations.unshift(aiConv);
      }

      return formattedConversations;

    } catch (e) {
      console.error("Critical DB Error (getConversations):", e);
      return [];
    }
  },

  ensureAiConversation: async (userId: string): Promise<Conversation | null> => {
     if (!supabaseUrl) return null;

     try {
       const { data: newConv, error: createError } = await supabase
         .from('conversations')
         .insert({ type: 'direct', name: 'Gemini Assistant' })
         .select()
         .single();

       if (createError) return null; 

       await supabase
         .from('conversation_participants')
         .insert({ conversation_id: newConv.id, user_id: userId });
       
       return {
         id: newConv.id,
         type: 'ai_assistant',
         name: 'Gemini Assistant',
         participants: [{ id: userId, name: 'Me', avatar: '', status: 'online' } as User, GEMINI_BOT_USER],
         lastMessageTimestamp: Date.now()
       };
     } catch (e) {
       return null;
     }
  },

  getMessages: async (conversationId: string): Promise<Message[]> => {
    if (!supabaseUrl) return [];

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:sender_id(full_name, avatar_url)')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        return [];
      }

      return data.map((m: any) => ({
        id: m.id,
        conversationId: m.conversation_id,
        senderId: m.is_ai_generated ? GEMINI_BOT_ID : (m.sender_id || GEMINI_BOT_ID),
        content: m.content || '',
        image: m.image_url,
        timestamp: new Date(m.created_at).getTime(),
        isAiGenerated: m.is_ai_generated
      }));
    } catch (e) {
      return [];
    }
  },

  sendMessage: async (conversationId: string, userId: string, content: string, image?: string, isAiGenerated: boolean = false): Promise<Message | null> => {
    if (!supabaseUrl) return null;

    const validSenderIdForDb = userId === GEMINI_BOT_ID ? undefined : userId;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: validSenderIdForDb, 
          content: content,
          image_url: image, 
          is_ai_generated: isAiGenerated
        })
        .select('*, sender:sender_id(full_name, avatar_url)')
        .single();

      if (error) {
        if (userId === GEMINI_BOT_ID) {
          return {
            id: `ai-msg-fallback-${Date.now()}`,
            conversationId,
            senderId: GEMINI_BOT_ID,
            content,
            image,
            timestamp: Date.now(),
            isAiGenerated: true
          };
        }
        return null;
      }

      return {
        id: data.id,
        conversationId: data.conversation_id,
        senderId: isAiGenerated ? GEMINI_BOT_ID : userId,
        content: data.content,
        image: data.image_url,
        timestamp: new Date(data.created_at).getTime(),
        isAiGenerated: data.is_ai_generated
      };
    } catch (e) {
      return null;
    }
  },

  subscribeToMessages: (conversationId: string, onMessage: (msg: Message) => void) => {
    return supabase
      .channel(`public:messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as any;
          const msg: Message = {
            id: m.id,
            conversationId: m.conversation_id,
            senderId: m.is_ai_generated ? GEMINI_BOT_ID : (m.sender_id || GEMINI_BOT_ID),
            content: m.content || '',
            image: m.image_url,
            timestamp: new Date(m.created_at).getTime(),
            isAiGenerated: m.is_ai_generated
          };
          onMessage(msg);
        }
      )
      .subscribe();
  },

  // --- ADMIN FUNCTIONS ---
  // IMPORTANT: These will only work if Supabase RLS policies allow "sonyddr666+admin@gmail.com" to SELECT all tables.
  
  adminGetAllUsers: async (): Promise<User[]> => {
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      return data.map((u: any) => ({
        id: u.id,
        name: u.full_name || 'Unknown',
        avatar: u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${u.id}`,
        status: 'offline'
      }));
    } catch (e) {
      console.error("Admin Fetch Users Error:", e);
      return [];
    }
  },

  adminGetUserConversations: async (userId: string): Promise<Conversation[]> => {
    // Reuse the existing getConversations but passing any userId (Admin privilege)
    return await db.getConversations(userId);
  }
};