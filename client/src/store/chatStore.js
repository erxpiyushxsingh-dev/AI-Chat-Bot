import { create } from 'zustand';

const useChatStore = create((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  isLoading: false,
  isSending: false,
  error: null,
  availableModels: [],
  currentModel: null,

  setConversations: (conversations) => set({ conversations }),
  
  setCurrentConversation: (conversation) => {
    set({ 
      currentConversation: conversation,
      messages: conversation?.messages || []
    });
  },

  addConversation: (conversation) => set((state) => ({
    conversations: [conversation, ...state.conversations]
  })),

  updateConversation: (conversationId, updates) => set((state) => ({
    conversations: state.conversations.map(conv => 
      conv.id === conversationId ? { ...conv, ...updates } : conv
    ),
    currentConversation: state.currentConversation?.id === conversationId 
      ? { ...state.currentConversation, ...updates }
      : state.currentConversation
  })),

  deleteConversation: (conversationId) => set((state) => ({
    conversations: state.conversations.filter(conv => conv.id !== conversationId),
    currentConversation: state.currentConversation?.id === conversationId 
      ? null 
      : state.currentConversation,
    messages: state.currentConversation?.id === conversationId ? [] : state.messages
  })),

  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),

  updateMessage: (messageId, updates) => set((state) => ({
    messages: state.messages.map(msg => 
      msg.id === messageId ? { ...msg, ...updates } : msg
    )
  })),

  setMessages: (messages) => set({ messages }),

  setLoading: (isLoading) => set({ isLoading }),

  setSending: (isSending) => set({ isSending }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  setAvailableModels: (models) => set({ availableModels: models }),

  setCurrentModel: (model) => set({ currentModel: model }),

  resetChat: () => set({
    conversations: [],
    currentConversation: null,
    messages: [],
    isLoading: false,
    isSending: false,
    error: null,
  }),

  getConversationById: (conversationId) => {
    const { conversations } = get();
    return conversations.find(conv => conv.id === conversationId);
  },

  getMessageStats: () => {
    const { messages } = get();
    const userMessages = messages.filter(msg => msg.role === 'user');
    const assistantMessages = messages.filter(msg => msg.role === 'assistant');
    
    return {
      totalMessages: messages.length,
      userMessages: userMessages.length,
      assistantMessages: assistantMessages.length,
      totalTokens: messages.reduce((sum, msg) => sum + (msg.tokens || 0), 0),
      userTokens: userMessages.reduce((sum, msg) => sum + (msg.tokens || 0), 0),
      assistantTokens: assistantMessages.reduce((sum, msg) => sum + (msg.tokens || 0), 0),
    };
  },
}));

export default useChatStore;
