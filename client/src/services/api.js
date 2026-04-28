import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  refreshToken: () => api.post('/auth/refresh'),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (userData) => api.put('/auth/profile', userData),
  changePassword: (passwordData) => api.put('/auth/change-password', passwordData),
  deleteAccount: () => api.delete('/auth/account'),
};

export const chatAPI = {
  createConversation: (data) => api.post('/chat/conversations', data),
  getConversations: (params) => api.get('/chat/conversations', { params }),
  getConversation: (conversationId) => api.get(`/chat/conversations/${conversationId}`),
  updateConversationTitle: (conversationId, title) => 
    api.put(`/chat/conversations/${conversationId}/title`, { title }),
  deleteConversation: (conversationId) => api.delete(`/chat/conversations/${conversationId}`),
  sendMessage: (data) => api.post('/chat/send', data),
  sendMessageStream: async (data, onChunk, onComplete, onError) => {
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`${API_BASE_URL}/chat/send-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'chunk') {
                fullResponse = data.fullResponse;
                if (onChunk) onChunk(data.content, fullResponse);
              } else if (data.type === 'done') {
                if (onChunk) onChunk('', data.content, true);
              } else if (data.type === 'complete') {
                if (onComplete) onComplete(data.data);
                return data.data;
              } else if (data.type === 'error') {
                if (onError) onError(data.error);
                throw new Error(data.error);
              }
            } catch (error) {
              console.error('Error parsing SSE message:', error);
            }
          }
        }
      }
    } catch (error) {
      if (onError) onError(error);
      throw error;
    }
  },
  getChatStats: () => api.get('/chat/stats'),
  searchConversations: (query) => api.get('/chat/search', { params: { q: query } }),
  exportConversation: (conversationId, format = 'json') => 
    api.get(`/chat/conversations/${conversationId}/export`, { 
      params: { format },
      responseType: format === 'json' ? 'json' : 'blob'
    }),
  generateTitle: (conversationId) => 
    api.post(`/chat/conversations/${conversationId}/generate-title`),
};

export const ollamaAPI = {
  checkConnection: () => api.get('/ollama/connection'),
  getModels: () => api.get('/ollama/models'),
  getModelInfo: (modelName) => api.get(`/ollama/models/${modelName}/info`),
  pullModel: (modelName) => api.post('/ollama/models/pull', { modelName }),
  deleteModel: (modelName) => api.delete(`/ollama/models/${modelName}`),
  generateResponse: (data) => api.post('/ollama/generate', data),
  generateEmbedding: (data) => api.post('/ollama/embeddings', data),
  createModel: (data) => api.post('/ollama/models/create', data),
  healthCheck: () => api.get('/ollama/health'),
};

export const healthAPI = {
  check: () => api.get('/health'),
};

export default api;
