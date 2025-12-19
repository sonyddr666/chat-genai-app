import React from 'react';
import { Message, User } from '../types';
import { marked } from 'marked';

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  sender?: User;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isMe, sender }) => {
  // Parse markdown for AI messages mainly, but useful for devs too
  const htmlContent = marked.parse(message.content, { async: false }) as string;

  return (
    <div className={`flex w-full mb-4 ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[90%] md:max-w-[75%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        {!isMe && sender && (
          <div className="flex-shrink-0 mr-3">
             <img 
               src={sender.avatar} 
               alt={sender.name} 
               className={`w-8 h-8 rounded-full object-cover ${sender.id === 'gemini-bot' ? 'p-1 bg-white' : ''}`}
             />
          </div>
        )}

        {/* Bubble Content */}
        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} min-w-0`}>
          <div
            className={`px-4 py-3 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed overflow-hidden break-words w-full
              ${isMe 
                ? 'bg-brand-600 text-white rounded-tr-sm' 
                : message.isAiGenerated 
                  ? 'bg-gradient-to-br from-indigo-900 to-purple-900 text-gray-100 rounded-tl-sm border border-indigo-500/50' 
                  : 'bg-dark-800 text-gray-200 rounded-tl-sm border border-gray-700'
              }
            `}
          >
            {/* Image Attachment */}
            {message.image && (
               <div className="mb-2 rounded-lg overflow-hidden">
                 <img src={message.image.startsWith('data:') ? message.image : message.image} alt="Attachment" className="max-w-full h-auto max-h-64 object-cover" />
               </div>
            )}
            
            {/* Text Content with Markdown Support */}
            <div 
              className={`prose prose-invert prose-sm max-w-none 
                ${isMe ? 'prose-headings:text-white prose-p:text-white prose-strong:text-white' : 'prose-headings:text-indigo-300'}
                [&>table]:w-full [&>table]:border-collapse [&>table]:border [&>table]:border-gray-600 [&>table]:my-2
                [&>table>thead>tr>th]:border [&>table>thead>tr>th]:border-gray-600 [&>table>thead>tr>th]:p-2 [&>table>thead>tr>th]:bg-black/20
                [&>table>tbody>tr>td]:border [&>table>tbody>tr>td]:border-gray-600 [&>table>tbody>tr>td]:p-2
                [&>pre]:bg-black/30 [&>pre]:p-2 [&>pre]:rounded
                [&>ul]:list-disc [&>ul]:pl-4
                [&>ol]:list-decimal [&>ol]:pl-4
              `}
              dangerouslySetInnerHTML={{ __html: htmlContent }} 
            />
          </div>
          
          {/* Timestamp */}
          <span className="text-xs text-gray-500 mt-1 mx-1">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;