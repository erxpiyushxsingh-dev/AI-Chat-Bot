import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  Send, Plus, MessageSquare, Trash2, Settings, 
  LogOut, Menu, X, Loader2, Copy, Check 
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import useChatStore from '../store/chatStore';
import { chatAPI, ollamaAPI } from '../services/api';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const ChatPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const {
    conversations,
    currentConversation,
    messages,
    isSending,
    setConversations,
    setCurrentConversation,
    addConversation,
    deleteConversation,
    addMessage,
    setSending,
    availableModels,
    setAvailableModels,
    currentModel,
    setCurrentModel,
  } = useChatStore();

  const [inputMessage, setInputMessage] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const messagesEndRef = useRef(null);
  const lastMessageCountRef = useRef(0);
  const [streamingMessage, setStreamingMessage] = useState(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = useCallback(async () => {
    try {
      const response = await chatAPI.getConversations();
      setConversations(response.data.data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }, [setConversations]);

  const loadModels = useCallback(async () => {
    try {
      const response = await ollamaAPI.getModels();
      setAvailableModels(response.data.data.models || []);
      if (response.data.data.models?.length > 0) {
        setCurrentModel(response.data.data.models[0].name);
      }
    } catch (error) {
      console.error('Failed to load models:', error);
      toast.error('Failed to load Ollama models. Make sure Ollama is running.');
    }
  }, [setAvailableModels, setCurrentModel]);

  useEffect(() => {
    loadConversations();
    loadModels();
  }, [loadConversations, loadModels]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-refresh messages every 10 seconds when a conversation is active
  useEffect(() => {
    if (!currentConversation || isSending) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await chatAPI.getConversation(currentConversation.id);
        const newMessages = response.data.data.messages || [];
        
        // Only update if there are new messages
        if (newMessages.length > lastMessageCountRef.current) {
          setCurrentConversation(response.data.data);
          lastMessageCountRef.current = newMessages.length;
        }
      } catch (error) {
        console.error('Failed to poll for new messages:', error);
      }
    }, 10000); // Poll every 10 seconds

    // Update the ref when messages change
    lastMessageCountRef.current = messages.length;

    return () => clearInterval(pollInterval);
  }, [currentConversation, isSending, messages, setCurrentConversation]);

  const handleNewConversation = async () => {
    try {
      const response = await chatAPI.createConversation({
        title: 'New Conversation',
        modelName: currentModel || 'llama2',
      });
      const newConversation = response.data.data;
      addConversation(newConversation);
      setCurrentConversation(newConversation);
    } catch (error) {
      console.error('Failed to create conversation:', error);
      toast.error('Failed to create conversation');
    }
  };

  const handleSelectConversation = async (conversation) => {
    try {
      const response = await chatAPI.getConversation(conversation.id);
      setCurrentConversation(response.data.data);
    } catch (error) {
      console.error('Failed to load conversation:', error);
      toast.error('Failed to load conversation');
    }
  };

  const handleDeleteConversation = async (conversationId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this conversation?')) {
      return;
    }
    
    try {
      await chatAPI.deleteConversation(conversationId);
      deleteConversation(conversationId);
      toast.success('Conversation deleted');
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      toast.error('Failed to delete conversation');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isSending) return;

    if (!currentConversation) {
      await handleNewConversation();
      return;
    }

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    try {
      // First, send the user message using the non-streaming endpoint to save it
      const response = await chatAPI.sendMessage({
        conversationId: currentConversation.id,
        message: userMessage,
        modelName: currentModel,
      });

      addMessage(response.data.data.userMessage);
      
      // Then use streaming for the assistant response
      const tempAssistantMessage = {
        id: Date.now(),
        role: 'assistant',
        content: '',
        tokens: 0
      };
      
      setStreamingMessage(tempAssistantMessage);

      await chatAPI.sendMessageStream(
        {
          conversationId: currentConversation.id,
          message: userMessage,
          modelName: currentModel,
        },
        (chunk, fullResponse, done) => {
          // Update streaming message content
          setStreamingMessage(prev => ({
            ...prev,
            content: fullResponse
          }));
          scrollToBottom();
        },
        (data) => {
          // On complete
          addMessage(data.assistantMessage);
          setStreamingMessage(null);
          loadConversations();
        },
        (error) => {
          // On error - don't show alert, just remove streaming message
          console.error('Streaming error:', error);
          setStreamingMessage(null);
        }
      );
      
      await loadConversations();
    } catch (error) {
      console.error('Failed to send message:', error);
      // Don't show toast error for timeout - keep loader on
      setStreamingMessage(null);
    } finally {
      setSending(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleCopy = (content, messageId) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
    toast.success('Copied to clipboard');
  };

  const MarkdownComponents = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 bg-secondary-50 border-r border-secondary-200 flex flex-col`}>
        <div className="p-4 border-b border-secondary-200">
          <Button
            onClick={handleNewConversation}
            className="w-full"
            variant="default"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Chat
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => handleSelectConversation(conv)}
              className={`sidebar-item cursor-pointer mb-1 ${
                currentConversation?.id === conv.id ? 'sidebar-item-active' : ''
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span className="flex-1 truncate text-sm">{conv.title}</span>
              <button
                onClick={(e) => handleDeleteConversation(conv.id, e)}
                className="opacity-0 group-hover:opacity-100 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-secondary-200 space-y-2">
          <div className="text-sm font-medium text-secondary-700">
            Model: {currentModel || 'None'}
          </div>
          <select
            value={currentModel || ''}
            onChange={(e) => setCurrentModel(e.target.value)}
            className="w-full text-sm border border-secondary-300 rounded-md px-2 py-1"
          >
            {availableModels.map((model) => (
              <option key={model.name} value={model.name}>
                {model.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 text-sm text-secondary-600">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="truncate">{user?.username}</span>
          </div>
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="sm"
            className="w-full justify-start"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-16 border-b border-secondary-200 flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <h1 className="text-lg font-semibold">
              {currentConversation?.title || 'New Conversation'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {!currentConversation ? (
            <div className="h-full flex items-center justify-center text-secondary-500">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 text-secondary-300" />
                <p className="text-lg">Start a new conversation</p>
                <p className="text-sm">Click "New Chat" to begin</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-secondary-500">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 text-secondary-300" />
                <p className="text-lg">No messages yet</p>
                <p className="text-sm">Send a message to start the conversation</p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-4">
              {[...messages, ...(streamingMessage ? [streamingMessage] : [])].map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-primary-600 text-white'
                        : 'bg-secondary-100 text-secondary-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        {message.role === 'assistant' ? (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={MarkdownComponents}
                            className="markdown prose-sm max-w-none"
                          >
                            {message.content}
                          </ReactMarkdown>
                        ) : (
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={() => handleCopy(message.content, message.id)}
                      >
                        {copiedMessageId === message.id ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    {message.tokens && (
                      <div className="text-xs opacity-70 mt-1">
                        {message.tokens} tokens
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isSending && !streamingMessage && (
                <div className="flex justify-start">
                  <div className="bg-secondary-100 rounded-lg px-4 py-3">
                    <Loader2 className="h-5 w-5 animate-spin text-secondary-400" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-secondary-200 p-4">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message..."
                disabled={isSending}
                className="flex-1"
              />
              <Button type="submit" disabled={isSending || !inputMessage.trim()}>
                {isSending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
