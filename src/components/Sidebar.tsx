import React, { useState } from 'react';
import { Conversation, User } from '../types';
import { db } from '../services/supabaseClient';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string;
  currentUser: User;
  onSelect: (id: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onNewChat: (targetUser: User) => void; // Callback when a user creates a chat
}

const Sidebar: React.FC<SidebarProps> = ({ conversations, activeId, currentUser, onSelect, isOpenMobile, onCloseMobile, onNewChat }) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const users = await db.searchUsers(query, currentUser.id);
    setSearchResults(users);
    setIsSearching(false);
  };

  const getConversationName = (conv: Conversation) => {
    if (conv.type === 'direct') {
      return conv.participants.find(p => p.id !== currentUser.id)?.name || 'Unknown User';
    }
    return conv.name;
  };

  const getAvatar = (conv: Conversation) => {
    if (conv.type === 'direct') {
      return conv.participants.find(p => p.id !== currentUser.id)?.avatar;
    }
    return conv.participants[1]?.avatar;
  };

  return (
    <>
      {/* Search Modal */}
      {isSearchOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          zIndex: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '500px',
            background: '#16213e',
            borderRadius: '16px',
            padding: '24px',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold' }}>New Message</h3>
              <button onClick={() => setIsSearchOpen(false)} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '24px', cursor: 'pointer' }}>
                ×
              </button>
            </div>

            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              autoFocus
              onChange={(e) => handleSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                background: '#0f0f1e',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#fff',
                marginBottom: '16px',
                outline: 'none'
              }}
            />

            {isSearching && <div style={{ textAlign: 'center', color: '#9ca3af', padding: '20px' }}>Searching...</div>}

            {!isSearching && searchQuery.length > 1 && searchResults.length === 0 && (
              <div style={{ textAlign: 'center', color: '#9ca3af', padding: '20px' }}>No users found.</div>
            )}

            {searchResults.map(user => (
              <div
                key={user.id}
                onClick={() => {
                  onNewChat(user);
                  setIsSearchOpen(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  transition: 'background 0.2s',
                  marginBottom: '8px'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#1f2937'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <img
                  src={user.avatar}
                  alt={user.name}
                  style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold' }}>{user.name}</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>Click to chat</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mobile Overlay */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 40,
            display: 'block'
          }}
        />
      )}

      {/* Sidebar Content */}
      <aside style={{
        width: '320px',
        background: '#16213e',
        borderRight: '1px solid #374151',
        display: 'flex',
        flexDirection: 'column',
        position: isOpenMobile ? 'fixed' : 'relative',
        top: 0,
        left: isOpenMobile ? 0 : 'auto',
        height: '100%',
        zIndex: isOpenMobile ? 50 : 'auto',
        transform: isOpenMobile ? 'translateX(0)' : 'translateX(0)',
        transition: 'transform 0.3s ease-in-out'
      }}>
        {/* Sidebar Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #374151',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
            />
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{currentUser.name}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>{currentUser.status}</div>
            </div>
          </div>
          <button
            onClick={() => setIsSearchOpen(true)}
            style={{
              padding: '8px',
              background: '#374151',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '18px'
            }}
            title="New Message"
          >
            ✏️
          </button>
        </div>

        {/* Conversations List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => {
                onSelect(conv.id);
                if (isOpenMobile) onCloseMobile();
              }}
              style={{
                padding: '12px',
                borderRadius: '12px',
                cursor: 'pointer',
                marginBottom: '8px',
                background: activeId === conv.id ? '#1f2937' : 'transparent',
                border: activeId === conv.id ? '1px solid #e94560' : '1px solid transparent',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
              onMouseOver={(e) => {
                if (activeId !== conv.id) {
                  e.currentTarget.style.background = '#1f2937';
                }
              }}
              onMouseOut={(e) => {
                if (activeId !== conv.id) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <img
                src={getAvatar(conv) || 'https://api.dicebear.com/7.x/shapes/svg?seed=default'}
                alt={getConversationName(conv)}
                style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 'bold',
                  fontSize: '14px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {getConversationName(conv)}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#9ca3af',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {conv.lastMessage || 'No messages yet'}
                </div>
              </div>
              {conv.unreadCount && conv.unreadCount > 0 && (
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: '#e94560',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  flexShrink: 0
                }}>
                  {conv.unreadCount}
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;