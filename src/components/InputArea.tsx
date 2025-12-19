import React, { useState, useRef, ChangeEvent } from 'react';

interface InputAreaProps {
  onSendMessage: (text: string, image: string | null) => void;
  disabled: boolean;
  placeholder?: string;
}

const InputArea: React.FC<InputAreaProps> = ({ onSendMessage, disabled, placeholder }) => {
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if ((!text.trim() && !image) || disabled) return;
    onSendMessage(text, image);
    setText('');
    setImage(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div style={{
      padding: '16px 24px',
      background: '#16213e',
      borderTop: '1px solid #374151',
      display: 'flex',
      alignItems: 'flex-end',
      gap: '12px',
      position: 'relative'
    }}>
      {/* Image Preview */}
      {image && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '24px',
          marginBottom: '8px',
          padding: '8px',
          background: '#1f2937',
          borderRadius: '8px',
          border: '1px solid #374151'
        }}>
          <img
            src={image}
            alt="Preview"
            style={{
              maxWidth: '200px',
              maxHeight: '200px',
              borderRadius: '8px'
            }}
          />
          <button
            onClick={() => setImage(null)}
            style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#dc2626'}
            onMouseOut={(e) => e.currentTarget.style.background = '#ef4444'}
          >
            ×
          </button>
        </div>
      )}

      {/* Attachment Button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <button
        onClick={triggerFileUpload}
        disabled={disabled}
        style={{
          padding: '12px',
          background: '#374151',
          border: 'none',
          borderRadius: '8px',
          color: '#fff',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: '20px',
          opacity: disabled ? 0.5 : 1,
          transition: 'all 0.2s',
          flexShrink: 0
        }}
        onMouseOver={(e) => {
          if (!disabled) e.currentTarget.style.background = '#4b5563';
        }}
        onMouseOut={(e) => {
          if (!disabled) e.currentTarget.style.background = '#374151';
        }}
      >
        📎
      </button>

      {/* Text Area */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder || "Type a message..."}
        style={{
          flex: 1,
          background: 'transparent',
          color: '#e5e7eb',
          padding: '12px',
          maxHeight: '128px',
          minHeight: '48px',
          resize: 'none',
          border: 'none',
          outline: 'none',
          fontSize: '14px'
        }}
        rows={1}
      />

      {/* Send Button */}
      <button
        onClick={handleSend}
        disabled={disabled || (!text.trim() && !image)}
        style={{
          padding: '12px 24px',
          background: (!text.trim() && !image) || disabled ? '#374151' : 'linear-gradient(135deg, #e94560 0%, #ff6b9d 100%)',
          border: 'none',
          borderRadius: '8px',
          color: '#fff',
          fontWeight: 'bold',
          cursor: (!text.trim() && !image) || disabled ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          opacity: (!text.trim() && !image) || disabled ? 0.5 : 1,
          transition: 'all 0.2s',
          flexShrink: 0
        }}
      >
        Send
      </button>
    </div>
  );
};

export default InputArea;