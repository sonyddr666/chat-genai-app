import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import MessageBubble from './components/MessageBubble';
import InputArea from './components/InputArea';
import Login from './components/Login';
import { supabase, db } from './services/supabaseClient';
import { generateAiResponseStream } from './services/geminiService';
import { Conversation, Message, User } from './types';

const ADMIN_EMAIL = 'sonyddr666+admin@gmail.com';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Admin State
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminUsers, setAdminUsers] = useState<User[]>([]);
  const [adminSelectedUserId, setAdminSelectedUserId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check Active Session on Mount
  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      // Safety timeout to prevent infinite spinner
      const timeout = setTimeout(() => {
        if (mounted && isAuthChecking) {
          console.warn("Auth check timed out, forcing UI render");
          setIsAuthChecking(false);
        }
      }, 5000);

      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
           console.error("Session check error:", error);
           if (mounted) setIsAuthenticated(false);
        } else if (session?.user) {
           if (mounted) await handleUserSession(session.user);
        } else {
           if (mounted) setIsAuthenticated(false);
        }
      } catch (e) {
        console.error("Auth session check failed:", e);
        if (mounted) setIsAuthenticated(false);
      } finally {
        clearTimeout(timeout);
        if (mounted) setIsAuthChecking(false);
      }
    };

    checkSession();

    // Listen for Auth Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      if (session?.user) {
        // Only update if user changed to avoid redundant calls
        if (!currentUser || currentUser.id !== session.user.id) {
           await handleUserSession(session.user);
        }
      } else {
        setIsAuthenticated(false);
        setCurrentUser(null);
        setUserEmail(null);
        setConversations([]);
        setMessages([]);
        setIsAdminMode(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array intentional

  const handleUserSession = async (supabaseUser: any) => {
    const user: User = {
      id: supabaseUser.id,
      name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
      avatar: supabaseUser.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${supabaseUser.id}`,
      status: 'online'
    };
    
    setCurrentUser(user);
    setUserEmail(supabaseUser.email);
    setIsAuthenticated(true);
    
    // Run data loading as side effects (do not await them to block Auth Checking state)
    db.upsertProfile(user).catch(err => console.warn("Profile sync check:", err));
    loadConversations(user.id); 
  };

  const loadConversations = async (userId: string) => {
    try {
      const convs = await db.getConversations(userId);
      setConversations(convs);
      
      if (convs.length > 0 && !activeConversationId) {
         // Default to AI Assistant if present, otherwise first chat
         const aiConv = convs.find(c => c.type === 'ai_assistant');
         setActiveConversationId(aiConv ? aiConv.id : convs[0].id);
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    }
  };

  const handleCreateNewChat = async (targetUser: User) => {
    if (!currentUser) return;
    
    // Create or get existing conversation
    const conversationId = await db.createDirectConversation(currentUser.id, targetUser.id);
    
    if (conversationId) {
      // Refresh conversations list to show the new one
      await loadConversations(currentUser.id);
      setActiveConversationId(conversationId);
      setIsSidebarOpen(false); // Close sidebar on mobile if open
    }
  };

  // --- Admin Logic ---
  const toggleAdminMode = async () => {
    if (!isAdminMode) {
      // Loading Admin Data
      const users = await db.adminGetAllUsers();
      setAdminUsers(users);
    } else {
      setAdminSelectedUserId(null);
      // Revert to self conversations
      if (currentUser) loadConversations(currentUser.id);
    }
    setIsAdminMode(!isAdminMode);
  };

  const handleAdminSelectUser = async (userId: string) => {
    setAdminSelectedUserId(userId);
    setActiveConversationId(null);
    const convs = await db.adminGetUserConversations(userId);
    setConversations(convs);
  };

  // Real-time Subscription for Messages
  useEffect(() => {
    if (!activeConversationId) return;

    const channel = db.subscribeToMessages(activeConversationId, (newMsg) => {
      setMessages((prev) => {
         if (prev.find(m => m.id === newMsg.id)) return prev;
         return [...prev, newMsg];
      });
      
      setConversations(prev => prev.map(c => 
        c.id === activeConversationId 
          ? { ...c, lastMessage: newMsg.image ? 'Image' : newMsg.content, lastMessageTimestamp: newMsg.timestamp }
          : c
      ));
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversationId]);

  // Load Messages on Conversation Change
  useEffect(() => {
    if (!isAuthenticated || !activeConversationId) return;

    const loadMessages = async () => {
      setIsLoadingMessages(true);
      const msgs = await db.getMessages(activeConversationId);
      setMessages(msgs);
      setIsLoadingMessages(false);
    };
    loadMessages();
  }, [activeConversationId, isAuthenticated]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiThinking]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleSendMessage = async (text: string, image: string | null) => {
    // Admin cannot send messages as other users (read only usually), but for now standard logic applies if logged in
    if (!currentUser || !activeConversationId) return;

    // 1. Optimistic Update
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      conversationId: activeConversationId,
      senderId: currentUser.id,
      content: text,
      image: image || undefined,
      timestamp: Date.now(),
      isAiGenerated: false
    };

    setMessages(prev => [...prev, optimisticMsg]);

    // 2. Persist to DB
    const savedMsg = await db.sendMessage(activeConversationId, currentUser.id, text, image || undefined);

    // Replace temp message with real one
    if (savedMsg) {
      setMessages(prev => prev.map(m => m.id === tempId ? savedMsg! : m));
    }

    // 3. Update Conversation Preview locally
    setConversations(prev => prev.map(c => 
      c.id === activeConversationId 
        ? { ...c, lastMessage: image ? 'Sent an image' : text, lastMessageTimestamp: Date.now() } 
        : c
    ));

    // 4. Handle AI Logic
    const activeConv = conversations.find(c => c.id === activeConversationId);
    if (activeConv?.type === 'ai_assistant') {
      await handleAiResponse(optimisticMsg);
    }
  };

  const handleAiResponse = async (userMessage: Message) => {
    setIsAiThinking(true);
    if (!activeConversationId || !currentUser) return;
    
    const aiTempId = `ai-temp-${Date.now()}`;
    const initialAiMsg: Message = {
      id: aiTempId,
      conversationId: activeConversationId,
      senderId: 'gemini-bot',
      content: '',
      timestamp: Date.now(),
      isAiGenerated: true
    };

    setMessages(prev => [...prev, initialAiMsg]);

    let imageDataForApi: string | null = null;
    if (userMessage.image) {
      if (userMessage.image.startsWith('data:')) {
          imageDataForApi = userMessage.image.split(',')[1];
      }
    }

    const history = messages; 
    let accumulatedText = "";
    
    // Stream response
    await generateAiResponseStream(
      history, 
      userMessage.content,
      imageDataForApi,
      (chunk) => {
        accumulatedText += chunk;
        setMessages(prev => 
          prev.map(m => m.id === aiTempId ? { ...m, content: accumulatedText } : m)
        );
      }
    );

    const savedAiMsg = await db.sendMessage(
      activeConversationId, 
      currentUser.id, 
      accumulatedText, 
      undefined, 
      true 
    );
    
    if (savedAiMsg) {
      setMessages(prev => prev.map(m => m.id === aiTempId ? savedAiMsg! : m));
    }

    setIsAiThinking(false);
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => {}} />;
  }

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  return (
    <div className="flex h-screen bg-dark-900 text-gray-100 font-sans overflow-hidden">
      
      {/* Admin Panel Overlay (User Selection) */}
      {isAdminMode && !adminSelectedUserId && (
         <div className="flex-1 flex flex-col w-full h-full bg-dark-900 p-8 overflow-y-auto">
             <div className="flex justify-between items-center mb-8">
               <h2 className="text-3xl font-bold text-red-500">Admin Control Panel</h2>
               <button onClick={toggleAdminMode} className="bg-gray-700 px-4 py-2 rounded text-white">Exit Admin</button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {adminUsers.map(u => (
                  <button 
                    key={u.id}
                    onClick={() => handleAdminSelectUser(u.id)}
                    className="flex items-center gap-4 p-4 bg-dark-800 rounded-xl hover:bg-gray-700 transition border border-gray-700 hover:border-red-500"
                  >
                     <img src={u.avatar} className="w-12 h-12 rounded-full" />
                     <div className="text-left">
                       <p className="font-bold text-white">{u.name}</p>
                       <p className="text-xs text-gray-400 font-mono">{u.id}</p>
                     </div>
                  </button>
                ))}
             </div>
         </div>
      )}

      {/* Main Chat Interface (Showing either My chats OR Selected User's chats if Admin) */}
      {(!isAdminMode || adminSelectedUserId) && (
        <>
        <Sidebar 
          conversations={conversations} 
          activeId={activeConversationId || ''} 
          currentUser={currentUser || { id: '', name: '', avatar: '', status: 'offline' }}
          onSelect={setActiveConversationId} 
          isOpenMobile={isSidebarOpen}
          onCloseMobile={() => setIsSidebarOpen(false)}
          onNewChat={handleCreateNewChat}
        />

        <main className="flex-1 flex flex-col relative w-full h-full">
          <header className={`h-16 border-b flex items-center px-4 justify-between bg-dark-900/95 backdrop-blur z-10 ${isAdminMode ? 'border-red-600' : 'border-gray-800'}`}>
            <div className="flex items-center gap-3">
              <button 
                className="md:hidden text-gray-400 p-1"
                onClick={() => setIsSidebarOpen(true)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
              </button>
              <div className="flex flex-col">
                <h2 className="font-bold text-gray-100 flex items-center gap-2">
                  {isAdminMode && <span className="bg-red-600 text-white text-[10px] px-1 rounded">DEBUG</span>}
                  {activeConversation?.type === 'direct' && activeConversation.participants 
                    ? activeConversation.participants.find(p => p.id !== (isAdminMode ? adminSelectedUserId : currentUser?.id))?.name || 'Chat'
                    : activeConversation?.name}
                </h2>
                {activeConversation?.type === 'ai_assistant' && (
                  <span className="text-xs text-brand-500 font-medium flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>
                    Gemini 3 Flash
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {userEmail === ADMIN_EMAIL && (
                <button 
                  onClick={toggleAdminMode}
                  className={`text-xs px-2 py-1 rounded font-bold ${isAdminMode ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                >
                  {isAdminMode ? 'EXIT ADMIN' : 'ADMIN PANEL'}
                </button>
              )}
              <button 
                onClick={handleSignOut}
                className="text-gray-400 hover:text-white text-sm"
              >
                Sign Out
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2 bg-[#121212]">
            {messages.map((msg) => {
              // Fix sender resolution logic for admin mode or bot
              let sender = activeConversation?.participants?.find(p => p.id === msg.senderId);
              
              if (msg.senderId === 'gemini-bot' || msg.isAiGenerated) {
                 sender = {id: 'gemini-bot', name: 'Gemini', avatar: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Google_Gemini_logo.svg', status: 'online'};
              }
              
              const isMe = msg.senderId === (isAdminMode ? adminSelectedUserId : currentUser?.id);

              return (
                <MessageBubble 
                  key={msg.id} 
                  message={msg} 
                  isMe={isMe} 
                  sender={sender as User}
                />
              );
            })}
            
            {isAiThinking && (
              <div className="flex justify-start w-full mb-4 animate-pulse">
                  <div className="flex items-center space-x-2 bg-dark-800 border border-gray-700 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <InputArea 
            onSendMessage={handleSendMessage} 
            disabled={isLoadingMessages || (activeConversation?.type === 'ai_assistant' && isAiThinking) || (isAdminMode && !activeConversationId)} 
            placeholder={
               isAdminMode 
               ? "Admin Read-Only Mode (Send logic acts as user)" 
               : activeConversation?.type === 'ai_assistant' ? "Ask Gemini anything..." : "Type a message..."
            }
          />
        </main>
        </>
      )}
    </div>
  );
};

export default App;