const axios = require('axios');

class OllamaService {
  constructor() {
    this.baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.defaultModel = process.env.DEFAULT_MODEL || 'llama2';
  }

  async checkConnection() {
    try {
      const response = await axios.get(`${this.baseURL}/api/tags`, { timeout: 5000 });
      return { connected: true, models: response.data.models };
    } catch (error) {
      return { 
        connected: false, 
        error: error.message,
        suggestion: 'Make sure Ollama is running on localhost:11434'
      };
    }
  }

  async getAvailableModels() {
    try {
      const response = await axios.get(`${this.baseURL}/api/tags`);
      return {
        success: true,
        models: response.data.models.map(model => ({
          name: model.name,
          size: model.size,
          modified_at: model.modified_at,
          digest: model.digest
        }))
      };
    } catch (error) {
      throw new Error(`Failed to fetch models: ${error.message}`);
    }
  }

  async pullModel(modelName) {
    try {
      const response = await axios.post(`${this.baseURL}/api/pull`, {
        name: modelName
      });
      
      return {
        success: true,
        message: `Model ${modelName} is being pulled. This may take several minutes.`
      };
    } catch (error) {
      throw new Error(`Failed to pull model ${modelName}: ${error.message}`);
    }
  }

  async generateResponse(prompt, modelName = null, options = {}) {
    const model = modelName || this.defaultModel;
    
    try {
      const response = await axios.post(`${this.baseURL}/api/generate`, {
        model: model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
          top_p: options.top_p || 0.9,
          max_tokens: options.max_tokens || 2048,
          ...options
        }
      });

      return {
        success: true,
        response: response.data.response,
        model: model,
        done: response.data.done,
        total_duration: response.data.total_duration,
        prompt_eval_count: response.data.prompt_eval_count,
        eval_count: response.data.eval_count,
        tokens: response.data.eval_count
      };
    } catch (error) {
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }

  async chat(messages, modelName = null, options = {}) {
    const model = modelName || this.defaultModel;
    const maxRetries = 3;
    const timeout = 600000; // 10 minutes timeout - no timeout on slow models
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries}: Sending chat request to Ollama with model ${model}`);
        
        const response = await axios.post(`${this.baseURL}/api/chat`, {
          model: model,
          messages: messages,
          stream: false,
          options: {
            temperature: options.temperature || 0.7,
            top_p: options.top_p || 0.9,
            num_predict: options.max_tokens || 512,
            num_ctx: 2048,
            ...options
          }
        }, {
          timeout: timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.data || !response.data.message) {
          throw new Error('Invalid response from Ollama');
        }

        console.log(`Ollama response received successfully`);
        
        return {
          success: true,
          response: response.data.message.content,
          model: model,
          done: response.data.done,
          total_duration: response.data.total_duration,
          prompt_eval_count: response.data.prompt_eval_count,
          eval_count: response.data.eval_count,
          tokens: response.data.eval_count
        };
      } catch (error) {
        console.error(`Chat attempt ${attempt}/${maxRetries} failed:`, error.message);
        
        if (attempt === maxRetries) {
          throw new Error(`Failed to chat after ${maxRetries} attempts: ${error.message}`);
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }
  }

  async chatStream(messages, modelName = null, options = {}, onChunk) {
    const model = modelName || this.defaultModel;
    const timeout = 600000; // 10 minutes timeout
    
    try {
      console.log(`Starting streaming chat with model ${model}`);
      
      const response = await axios.post(`${this.baseURL}/api/chat`, {
        model: model,
        messages: messages,
        stream: true,
        options: {
          temperature: options.temperature || 0.7,
          top_p: options.top_p || 0.9,
          num_predict: options.max_tokens || 256, // Reduced from 512 for faster response
          num_ctx: 1024, // Reduced from 2048 for faster processing
          num_thread: 4, // Use multiple threads if available
          ...options
        }
      }, {
        timeout: timeout,
        headers: {
          'Content-Type': 'application/json'
        },
        responseType: 'stream'
      });

      let fullResponse = '';
      
      return new Promise((resolve, reject) => {
        response.data.on('data', (chunk) => {
          try {
            const lines = chunk.toString().split('\n').filter(line => line.trim());
            
            for (const line of lines) {
              const data = JSON.parse(line);
              
              if (data.message && data.message.content) {
                const content = data.message.content;
                fullResponse += content;
                
                if (onChunk) {
                  onChunk(content, fullResponse, data.done);
                }
              }
              
              if (data.done) {
                console.log(`Streaming completed. Total tokens: ${data.eval_count}`);
                resolve({
                  success: true,
                  response: fullResponse,
                  model: model,
                  done: true,
                  total_duration: data.total_duration,
                  prompt_eval_count: data.prompt_eval_count,
                  eval_count: data.eval_count,
                  tokens: data.eval_count
                });
              }
            }
          } catch (error) {
            console.error('Error parsing stream chunk:', error);
          }
        });

        response.data.on('end', () => {
          console.log('Stream ended');
          if (!fullResponse) {
            reject(new Error('Stream ended without response'));
          }
        });

        response.data.on('error', (error) => {
          console.error('Stream error:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Streaming chat failed:', error);
      throw new Error(`Failed to stream chat: ${error.message}`);
    }
  }

  async generateEmbedding(text, modelName = null) {
    const model = modelName || this.defaultModel;
    
    try {
      const response = await axios.post(`${this.baseURL}/api/embeddings`, {
        model: model,
        prompt: text
      });

      return {
        success: true,
        embedding: response.data.embedding,
        model: model
      };
    } catch (error) {
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  async getModelInfo(modelName) {
    try {
      const response = await axios.post(`${this.baseURL}/api/show`, {
        name: modelName
      });

      return {
        success: true,
        info: response.data
      };
    } catch (error) {
      throw new Error(`Failed to get model info: ${error.message}`);
    }
  }

  async deleteModel(modelName) {
    try {
      const response = await axios.delete(`${this.baseURL}/api/delete`, {
        data: { name: modelName }
      });

      return {
        success: true,
        message: `Model ${modelName} deleted successfully`
      };
    } catch (error) {
      throw new Error(`Failed to delete model: ${error.message}`);
    }
  }

  async createModel(modelName, modelfile) {
    try {
      const response = await axios.post(`${this.baseURL}/api/create`, {
        name: modelName,
        modelfile: modelfile
      });

      return {
        success: true,
        message: `Model ${modelName} creation started. This may take several minutes.`
      };
    } catch (error) {
      throw new Error(`Failed to create model: ${error.message}`);
    }
  }

  formatMessagesForOllama(messages) {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  async healthCheck() {
    try {
      const start = Date.now();
      const response = await axios.get(`${this.baseURL}/api/tags`, { timeout: 3000 });
      const latency = Date.now() - start;
      
      return {
        status: 'healthy',
        latency: latency,
        models_count: response.data.models.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new OllamaService();
