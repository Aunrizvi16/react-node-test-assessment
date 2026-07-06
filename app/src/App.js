import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';
import {
  getPusherClient,
  isPusherConfigured,
  MESSAGES_CHANNEL,
  EVENTS,
} from './pusher';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function App() {
  // `messages` is the live, Pusher-powered feed. It is always kept current
  // (even while a search is active) so clearing the search resumes seamlessly.
  const [messages, setMessages] = useState([]);
  const [username, setUsername] = useState('');
  const [messageText, setMessageText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Search state. When `searchQuery` is non-empty we show `searchResults`
  // instead of the live feed; the feed keeps updating in the background.
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const isSearching = searchQuery.trim().length > 0;
  const displayedMessages = isSearching ? searchResults : messages;

  useEffect(() => {
    fetchMessages();
  }, []);

  // Subscribe to Pusher and live-update the feed. Runs once on mount.
  useEffect(() => {
    if (!isPusherConfigured) return undefined;

    const client = getPusherClient();
    if (!client) return undefined;

    const channel = client.subscribe(MESSAGES_CHANNEL);

    const handleNewMessage = (newMessage) => {
      if (!newMessage || !newMessage.id) return;
      setMessages((prev) => {
        // Guard against duplicates (e.g. the sender's own optimistic append).
        if (prev.some((msg) => msg.id === newMessage.id)) {
          return prev;
        }
        return [...prev, newMessage];
      });
    };

    const handleMessageDeleted = (payload) => {
      const deletedId = payload && payload.id;
      if (!deletedId) return;
      setMessages((prev) => prev.filter((msg) => msg.id !== deletedId));
      // Also drop it from any active search results.
      setSearchResults((prev) => prev.filter((msg) => msg.id !== deletedId));
    };

    channel.bind(EVENTS.NEW_MESSAGE, handleNewMessage);
    channel.bind(EVENTS.MESSAGE_DELETED, handleMessageDeleted);

    return () => {
      channel.unbind(EVENTS.NEW_MESSAGE, handleNewMessage);
      channel.unbind(EVENTS.MESSAGE_DELETED, handleMessageDeleted);
      client.unsubscribe(MESSAGES_CHANNEL);
    };
  }, []);

  // Debounced search (300ms). Hits the search endpoint while the query is
  // non-empty; clearing the query returns to the live feed.
  useEffect(() => {
    const trimmed = searchQuery.trim();

    if (!trimmed) {
      setSearchResults([]);
      setSearchLoading(false);
      return undefined;
    }

    setSearchLoading(true);
    const timeoutId = setTimeout(async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/messages/search`, {
          params: { q: trimmed },
        });
        setSearchResults(response.data.messages || []);
      } catch (err) {
        console.error('Error searching messages:', err);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Auto-scroll to the bottom of the live feed as new messages arrive.
  // Skipped while searching so search results are not yanked around.
  useEffect(() => {
    if (isSearching) return;
    scrollToBottom();
  }, [messages, isSearching]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`${API_BASE_URL}/api/messages`);
      setMessages(response.data.messages || []);
    } catch (err) {
      setError('Failed to load messages');
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }

      setSelectedImage(file);
      setError('');

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!username.trim()) {
      setError('Please enter your username');
      return;
    }

    if (!messageText.trim() && !selectedImage) {
      setError('Please enter a message or select an image');
      return;
    }

    try {
      setLoading(true);
      setError('');

      let createdMessage = null;

      if (selectedImage) {
        const formData = new FormData();
        formData.append('username', username.trim());
        formData.append('message', messageText.trim());
        formData.append('image', selectedImage);

        const response = await axios.post(`${API_BASE_URL}/api/messages/with-image`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        createdMessage = response.data?.message;
        removeImage();
      } else {
        const response = await axios.post(`${API_BASE_URL}/api/messages`, {
          username: username.trim(),
          message: messageText.trim(),
        });
        createdMessage = response.data?.message;
      }

      setMessageText('');

      // Refresh messages to show the new one
      if (createdMessage) {
        setMessages((prev) => {
          if (prev.some((msg) => msg.id === createdMessage.id)) {
            return prev;
          }
          return [...prev, createdMessage];
        });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send message');
      console.error('Error sending message:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/api/messages/${messageId}`);
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete message');
      console.error('Error deleting message:', err);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = (msg) => (
    <div key={msg.id} className="message-item">
      <div className="message-header">
        <span className="message-username">{msg.username}</span>
        <span className="message-time">{formatTime(msg.created_at)}</span>
      </div>
      {msg.image_url && (
        <div className="message-image">
          <img
            src={`${API_BASE_URL}${msg.image_url}`}
            alt="Shared"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
      )}
      {msg.message && (
        <div className="message-text">{msg.message}</div>
      )}
      <button
        className="delete-message-btn"
        onClick={() => handleDeleteMessage(msg.id)}
        title="Delete message"
      >
        ×
      </button>
    </div>
  );

  return (
    <div className="App">
      <header className="App-header">
        <h1>💬 Chat App</h1>
        <p>Send messages and share images</p>
      </header>

      <main className="chat-container">
        <div className="search-bar">
          <input
            type="text"
            placeholder="🔍 Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search messages"
          />
          {isSearching && (
            <span className="search-status">
              {searchLoading
                ? 'Searching…'
                : `${searchResults.length} result${searchResults.length === 1 ? '' : 's'}`}
            </span>
          )}
        </div>

        <div className="chat-messages" id="messages-container">
          {isSearching ? (
            searchLoading && searchResults.length === 0 ? (
              <div className="loading">Searching messages...</div>
            ) : searchResults.length === 0 ? (
              <div className="no-messages">
                No messages match &ldquo;{searchQuery.trim()}&rdquo;.
              </div>
            ) : (
              displayedMessages.map(renderMessage)
            )
          ) : loading && messages.length === 0 ? (
            <div className="loading">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="no-messages">
              No messages yet. Start the conversation!
            </div>
          ) : (
            displayedMessages.map(renderMessage)
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input-form" onSubmit={handleSendMessage}>
          {error && (
            <div className="error-message">{error}</div>
          )}

          <div className="input-group">
            <input
              type="text"
              placeholder="Your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="username-input"
              disabled={loading}
            />
          </div>

          {imagePreview && (
            <div className="image-preview">
              <img src={imagePreview} alt="Preview" />
              <button type="button" onClick={removeImage} className="remove-image-btn">
                Remove
              </button>
            </div>
          )}

          <div className="input-group">
            <input
              type="text"
              placeholder="Type your message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="message-input"
              disabled={loading}
            />
            <label className="image-upload-label">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                disabled={loading}
                style={{ display: 'none' }}
              />
              📷
            </label>
          </div>

          <button
            type="submit"
            className="send-button"
            disabled={loading || (!messageText.trim() && !selectedImage)}
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </form>
      </main>
    </div>
  );
}

export default App;
