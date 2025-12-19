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
    <div style={{
      display: 'flex',
      justifyContent: isMe ? 'flex-end' : 'flex-start',
      gap: '12px',
      alignItems: 'flex-start'
    }}>
      {/* Avatar */}
      {!isMe && sender && (
        <img
          src={sender.avatar}
          alt={sender.name}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            objectFit: 'cover',
            flexShrink: 0
          }}
        />
      )}

      {/* Bubble Content */}
      <div style={{
        maxWidth: '70%',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        {/* Image Attachment */}
        {message.image && (
          <img
            src={message.image}
            alt="Attachment"
            style={{
              maxWidth: '100%',
              borderRadius: '12px',
              border: '1px solid #374151'
            }}
          />
        )}

        {/* Text Content with Markdown Support */}
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '12px',
            background: isMe ? 'linear-gradient(135deg, #e94560 0%, #ff6b9d 100%)' : '#1f2937',
            color: '#fff',
            wordWrap: 'break-word',
            fontSize: '14px',
            lineHeight: '1.5'
          }}
          className={`
            [&>table]:w-full [&>table]:border-collapse [&>table]:border [&>table]:border-gray-600 [&>table]:my-2
            [&>table>thead>tr>th]:border [&>table>thead>tr>th]:border-gray-600 [&>table>thead>tr>th]:p-2 [&>table>thead>tr>th]:bg-black/20
            [&>table>tbody>tr>td]:border [&>table>tbody>tr>td]:border-gray-600 [&>table>tbody>tr>td]:p-2
            [&>pre]:bg-black/30 [&>pre]:p-2 [&>pre]:rounded
            [&>ul]:list-disc [&>ul]:pl-4
            [&>ol]:list-decimal [&>ol]:pl-4
          `}
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />

        {/* Timestamp */}
        <div style={{
          fontSize: '11px',
          color: '#9ca3af',
          textAlign: isMe ? 'right' : 'left',
          paddingLeft: '4px',
          paddingRight: '4px'
        }}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;