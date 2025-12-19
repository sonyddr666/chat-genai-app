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
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-dark-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden animate-pulse-fast-none transition-all">
             <div className="p-4 border-b border-gray-800 flex items-center justify-between">
               <h3 className="text-white font-bold text-lg">New Message</h3>
               <button onClick={() => setIsSearchOpen(false)} className="text-gray-400 hover:text-white">
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
               </button>
             </div>
             
             <div className="p-4">
               <input 
                 type="text"
                 autoFocus
                 placeholder="Search users by name..."
                 className="w-full bg-dark-800 text-white p-3 rounded-xl border border-gray-700 focus:border-brand-500 focus:outline-none"
                 value={searchQuery}
                 onChange={(e) => handleSearch(e.target.value)}
               />
             </div>

             <div className="max-h-64 overflow-y-auto px-4 pb-4 space-y-2">
                {isSearching && <div className="text-center text-gray-500 py-4">Searching...</div>}
                {!isSearching && searchQuery.length > 1 && searchResults.length === 0 && (
                  <div className="text-center text-gray-500 py-4">No users found.</div>
                )}
                {searchResults.map(user => (
                  <button 
                    key={user.id}
                    onClick={() => {
                      onNewChat(user);
                      setIsSearchOpen(false);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="w-full flex items-center gap-3 p-2 hover:bg-dark-800 rounded-lg transition-colors text-left"
                  >
                     <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
                     <div className="flex flex-col">
                       <span className="text-white font-medium">{user.name}</span>
                       <span className="text-xs text-gray-500">Click to chat</span>
                     </div>
                  </button>
                ))}
             </div>
          </div>
        </div>
      )}

      {/* Mobile Overlay */}
      {isOpenMobile && (
        <div 
          className="fixed inset-0 z-20 bg-black/50 md:hidden backdrop-blur-sm"
          onClick={onCloseMobile}
        ></div>
      )}

      {/* Sidebar Content */}
      <aside 
        className={`fixed md:static inset-y-0 left-0 z-30 w-72 bg-dark-900 border-r border-gray-800 transform transition-transform duration-300 ease-in-out md:transform-none flex flex-col
          ${isOpenMobile ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-tr from-brand-500 to-purple-600 flex items-center justify-center text-white font-bold">
              G3
            </div>
            <h1 className="font-bold text-lg text-white tracking-tight">Flash Messenger</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {/* New Chat Button */}
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-brand-600 text-white hover:bg-brand-500 transition-colors"
              title="New Chat"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
            
            <button onClick={onCloseMobile} className="md:hidden text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {conversations.map(conv => {
            const isActive = conv.id === activeId;
            const isAI = conv.type === 'ai_assistant';
            
            return (
              <button
                key={conv.id}
                onClick={() => {
                  onSelect(conv.id);
                  onCloseMobile();
                }}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-dark-800 transition-colors
                  ${isActive ? 'bg-dark-800 border-r-4 border-brand-500' : 'border-r-4 border-transparent'}
                `}
              >
                <div className="relative">
                  <img 
                    src={getAvatar(conv)} 
                    alt="Avatar" 
                    className={`w-10 h-10 rounded-full object-cover ${isAI ? 'p-1 bg-white' : ''}`} 
                  />
                  {!isAI && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-dark-900 rounded-full"></span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className={`font-medium truncate ${isAI ? 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400' : 'text-gray-200'}`}>
                      {getConversationName(conv)}
                    </span>
                    {conv.lastMessageTimestamp && (
                      <span className="text-xs text-gray-600">
                         {new Date(conv.lastMessageTimestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {conv.lastMessage || 'No messages yet'}
                  </p>
                </div>
                {conv.unreadCount ? (
                   <span className="bg-brand-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                     {conv.unreadCount}
                   </span>
                ) : null}
              </button>
            );
          })}
        </div>
        
        <div className="p-4 border-t border-gray-800">
           <div className="flex items-center gap-3 px-2">
              <img src={currentUser.avatar} alt="Me" className="w-8 h-8 rounded-full" />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-200">{currentUser.name}</span>
                <span className="text-xs text-green-500 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span> Online
                </span>
              </div>
           </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;