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
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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
      setIsAdminMode(true);
      setAdminSelectedUserId(null); // Reset selection
      setActiveConversationId(null);
      setMessages([]);
    } else {
      // Exit Admin Mode
      setIsAdminMode(false);
      setAdminUsers([]);
      setAdminSelectedUserId(null);
      // Reload my conversations
      if (currentUser) loadConversations(currentUser.id);
    }
  };

  const handleSelectUserAsAdmin = async (userId: string) => {
    setAdminSelectedUserId(userId);
    const convs = await db.getConversations(userId);
    setConversations(convs);
    if (convs.length > 0) {
      const aiConv = convs.find(c => c.type === 'ai_assistant');
      setActiveConversationId(aiConv ? aiConv.id : convs[0].id);
    } else {
      setActiveConversationId(null);
      setMessages([]);
    }
  };

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversationId) {
      setIsLoadingMessages(true);
      db.getMessages(activeConversationId)
        .then(msgs => {
          setMessages(msgs);
          setIsLoadingMessages(false);
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        })
        .catch(err => {
          console.error("Error loading messages:", err);
          setIsLoadingMessages(false);
        });
    } else {
      setMessages([]);
    }
  }, [activeConversationId]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (text: string, image: string | null) => {
    if (!activeConversationId || !currentUser) return;

    const activeConv = conversations.find(c => c.id === activeConversationId);
    if (!activeConv) return;

    const actualSenderId = isAdminMode && adminSelectedUserId ? adminSelectedUserId : currentUser.id;

    // Add user message immediately to UI
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId: activeConversationId,
      senderId: actualSenderId,
      content: text,
      image: image || undefined,
      timestamp: Date.now(),
      isAiGenerated: false
    };
    setMessages(prev => [...prev, userMessage]);

    // Send to DB
    const savedMessage = await db.sendMessage(
      activeConversationId,
      actualSenderId,
      text,
      image || undefined,
      false
    );

    // Update temp message with real ID
    if (savedMessage) {
      setMessages(prev =>
        prev.map(m => (m.id === userMessage.id ? { ...savedMessage } : m))
      );
    }

    // If AI Assistant conversation, generate AI response
    if (activeConv.type === 'ai_assistant') {
      setIsAiThinking(true);

      const conversationHistory = messages;
      let aiResponseText = "";
      const aiMessageId = `ai-temp-${Date.now()}`;

      // Add empty AI message bubble
      const aiMessage: Message = {
        id: aiMessageId,
        conversationId: activeConversationId,
        senderId: 'gemini-bot',
        content: '',
        timestamp: Date.now(),
        isAiGenerated: true
      };
      setMessages(prev => [...prev, aiMessage]);

      try {
        // Stream AI Response
        const imageData = image ? image.split(',')[1] : null;
        await generateAiResponseStream(
          conversationHistory,
          text,
          imageData,
          (chunk) => {
            aiResponseText += chunk;
            setMessages(prev =>
              prev.map(m =>
                m.id === aiMessageId ? { ...m, content: aiResponseText } : m
              )
            );
          }
        );

        // Save AI message to DB
        const savedAiMessage = await db.sendMessage(
          activeConversationId,
          'gemini-bot',
          aiResponseText,
          undefined,
          true
        );

        if (savedAiMessage) {
          setMessages(prev =>
            prev.map(m => (m.id === aiMessageId ? savedAiMessage : m))
          );
        }
      } catch (error) {
        console.error("AI generation error:", error);
      } finally {
        setIsAiThinking(false);
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const conversationName = activeConversation
    ? activeConversation.type === 'direct'
      ? activeConversation.participants.find(p => p.id !== (isAdminMode ? adminSelectedUserId : currentUser?.id))?.name || 'Unknown'
      : activeConversation.name
    : 'Select a chat';

  // --- UI Rendering ---
  if (isAuthChecking) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 100%)',
        color: '#fff',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid rgba(255,255,255,0.1)',
          borderTop: '4px solid #fff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p>Loading...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleUserSession} />;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 100%)', color: '#fff', overflow: 'hidden' }}>
      {/* Admin User Selection Panel */}
      {isAdminMode && !adminSelectedUserId && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#e94560' }}>🛡️ Admin Panel</h2>
            <button
              onClick={toggleAdminMode}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #e94560 0%, #c72c41 100%)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'transform 0.2s'
              }}
              onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
              onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              Exit Admin Mode
            </button>
          </div>
          <p style={{ marginBottom: '20px', color: '#9ca3af' }}>Select a user to view their conversations:</p>
          {adminUsers.map(u => (
            <div
              key={u.id}
              onClick={() => handleSelectUserAsAdmin(u.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px',
                background: '#16213e',
                borderRadius: '12px',
                cursor: 'pointer',
                marginBottom: '12px',
                border: '1px solid #374151',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#1f2937';
                e.currentTarget.style.borderColor = '#e94560';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#16213e';
                e.currentTarget.style.borderColor = '#374151';
              }}
            >
              <img
                src={u.avatar}
                alt={u.name}
                style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{u.name}</div>
                <div style={{ fontSize: '14px', color: '#9ca3af' }}>{u.id}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Chat Interface (Showing either My chats OR Selected User's chats if Admin) */}
      {(!isAdminMode || adminSelectedUserId) && (
        <>
          <Sidebar
            conversations={conversations}
            activeId={activeConversationId || ''}
            currentUser={isAdminMode && adminSelectedUserId ? adminUsers.find(u => u.id === adminSelectedUserId)! : currentUser!}
            onSelect={setActiveConversationId}
            isOpenMobile={isSidebarOpen}
            onCloseMobile={() => setIsSidebarOpen(false)}
            onNewChat={handleCreateNewChat}
          />

          <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header */}
            <header style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 24px',
              background: '#16213e',
              borderBottom: '1px solid #374151'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  style={{
                    display: 'block',
                    padding: '8px',
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '20px'
                  }}
                >
                  ☰
                </button>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '18px' }}>
                    {isAdminMode && `[ADMIN VIEW] `}{conversationName}
                  </div>
                  {activeConversation && activeConversation.type === 'ai_assistant' && (
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>AI Assistant • Always online</div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                {userEmail === ADMIN_EMAIL && (
                  <button
                    onClick={toggleAdminMode}
                    style={{
                      padding: '8px 16px',
                      background: isAdminMode ? 'linear-gradient(135deg, #e94560 0%, #c72c41 100%)' : '#374151',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    {isAdminMode ? '🛡️ Exit Admin' : '🛡️ Admin'}
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  style={{
                    padding: '8px 16px',
                    background: '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  Logout
                </button>
              </div>
            </header>

            {/* Messages Area */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {isLoadingMessages ? (
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: '20px' }}>Loading messages...</div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px' }}>
                  {activeConversation?.type === 'ai_assistant' ? 'Start chatting with Gemini!' : 'No messages yet. Say hi!'}
                </div>
              ) : (
                messages.map((msg) => {
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
                      sender={sender}
                    />
                  );
                })
              )}
              {isAiThinking && (
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  padding: '12px',
                  background: '#16213e',
                  borderRadius: '12px',
                  width: 'fit-content',
                  alignItems: 'center'
                }}>
                  <div style={{ width: '8px', height: '8px', background: '#e94560', borderRadius: '50%', animation: 'pulse 1.5s ease-in-out infinite' }} />
                  <div style={{ width: '8px', height: '8px', background: '#e94560', borderRadius: '50%', animation: 'pulse 1.5s ease-in-out infinite 0.2s' }} />
                  <div style={{ width: '8px', height: '8px', background: '#e94560', borderRadius: '50%', animation: 'pulse 1.5s ease-in-out infinite 0.4s' }} />
                  <style>{`@keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }`}</style>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
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