import React, { useState, useEffect } from 'react';
import axios from 'axios';
import avatar from "./avatar-1.png";
import botAvatar from "./bot-avatar.png";
import { Button, Menu, MenuItem, IconButton } from '@mui/material';
import { MoreVert as MoreVertIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import './App.css'; // Özel CSS dosyanızı içe aktarın

const App = () => {
  const [chats, setChats] = useState(() => {
    const savedChats = localStorage.getItem('chats');
    return savedChats ? JSON.parse(savedChats) : [];
  });
  const [selectedChatIndex, setSelectedChatIndex] = useState(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    localStorage.setItem('chats', JSON.stringify(chats));
  }, [chats]);

  const handleStartNewChat = () => {
    const newChat = {
      id: chats.length + 1,
      messages: [],
    };
    setChats([...chats, newChat]);
    setSelectedChatIndex(chats.length);
  };

  const handleSelectChat = (index) => {
    setSelectedChatIndex(index);
  };

  const handleDeleteChat = (index) => {
    if (index !== null) {
      const updatedChats = chats.filter((_, i) => i !== index);
      setChats(updatedChats);
      // Silinen sohbetin ardından yeni bir sohbet seçilmesi veya seçimin temizlenmesi
      if (updatedChats.length === 0) {
        setSelectedChatIndex(null);
      } else {
        setSelectedChatIndex(prevIndex => (prevIndex > 0 ? prevIndex - 1 : 0));
      }
    }
  };

  const handleSendMessage = async () => {
    if (input.trim() === '') return;
    if (selectedChatIndex === null) return;

    const newMessage = { role: 'user', text: input, timestamp: new Date() };
    const updatedChats = [...chats];
    updatedChats[selectedChatIndex].messages.push(newMessage);
    setChats(updatedChats);
    setInput('');
    setIsTyping(true);

    try {
      let response = await axios.post('http://localhost:5000/gemini', {
        history: updatedChats[selectedChatIndex].messages,
        prompt: input
      });
      const botMessage = { role: 'model', text: response.data.text || response.data, timestamp: new Date() };
      updatedChats[selectedChatIndex].messages.push(botMessage);
      setChats(updatedChats);

    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now - new Date(timestamp)) / 1000 / 60);

    if (diffInMinutes < 1) {
      return 'Şimdi';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} dakika önce`;
    } else {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} saat önce`;
    }
  };

  const isCodeMessage = (message) => {
    const codeBlockPattern = /```[\s\S]*?```/g;
    return codeBlockPattern.test(message);
  };

  const extractCode = (message) => {
    const codeBlockPattern = /```([\s\S]*?)```/;
    const match = message.match(codeBlockPattern);
    return match ? match[1] : null;
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-1/4 bg-gray-200 p-4 flex flex-col">
        <h2 className="text-lg font-bold mb-4">Sohbetler</h2>
        <div className="flex flex-col gap-2 flex-grow overflow-y-auto">
          {/* Chat list item */}
          {chats.map((chat, index) => (
            <div
              key={chat.id}
              className={`p-2 bg-white rounded-lg shadow cursor-pointer ${selectedChatIndex === index ? 'bg-blue-200' : ''}`}
              onClick={() => handleSelectChat(index)}
            >
              <div className="flex justify-between items-center">
                <span>Sohbet {chat.id}</span>
                <IconButton onClick={() => handleDeleteChat(index)}><DeleteIcon /></IconButton>
              </div>
            </div>
          ))}
        </div>
        <Button variant="contained" className="mt-4" onClick={handleStartNewChat}>Yeni Sohbet</Button>
      </div>

      {/* Chat Area */}
      <div className="w-3/4 bg-gray-100 p-4 flex flex-col">
        {selectedChatIndex !== null && chats[selectedChatIndex] ? (
          <>
            <div className="flex-grow overflow-y-auto">
              {chats[selectedChatIndex].messages.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : ''} mb-4`}>
                  <div className="max-w-xs bg-white p-3 rounded-lg shadow">
                    {isCodeMessage(message.text) ? (
                      <SyntaxHighlighter language="javascript" style={docco}>
                        {extractCode(message.text)}
                      </SyntaxHighlighter>
                    ) : (
                      <p>{message.text}</p>
                    )}
                    <div className="text-xs text-gray-500 mt-2">{formatTimestamp(message.timestamp)}</div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex mb-4">
                  <div className="max-w-xs bg-white p-3 rounded-lg shadow">Yazıyor...</div>
                </div>
              )}
            </div>

            <div className="mt-4">
              <div className="flex items-center">
                <input
                  className="flex-grow p-2 border rounded-lg mr-2"
                  placeholder="Mesajınızı yazın..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <Button variant="contained" color="primary" onClick={handleSendMessage}>Gönder</Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p>Bir sohbet başlatmak için yeni sohbet ekleyin veya bir sohbet seçin.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;