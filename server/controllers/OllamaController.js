const OllamaService = require('../services/OllamaService');

class OllamaController {
  async checkConnection(req, res) {
    try {
      const status = await OllamaService.checkConnection();
      
      res.status(200).json({
        success: true,
        data: status
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getModels(req, res) {
    try {
      const models = await OllamaService.getAvailableModels();
      
      res.status(200).json({
        success: true,
        data: models
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async pullModel(req, res) {
    try {
      const { modelName } = req.body;

      if (!modelName) {
        return res.status(400).json({
          success: false,
          error: 'Model name is required'
        });
      }

      const result = await OllamaService.pullModel(modelName);
      
      res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async getModelInfo(req, res) {
    try {
      const { modelName } = req.params;

      if (!modelName) {
        return res.status(400).json({
          success: false,
          error: 'Model name is required'
        });
      }

      const info = await OllamaService.getModelInfo(modelName);
      
      res.status(200).json({
        success: true,
        data: info
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  }

  async deleteModel(req, res) {
    try {
      const { modelName } = req.params;

      if (!modelName) {
        return res.status(400).json({
          success: false,
          error: 'Model name is required'
        });
      }

      const result = await OllamaService.deleteModel(modelName);
      
      res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async generateResponse(req, res) {
    try {
      const { prompt, modelName, options } = req.body;

      if (!prompt) {
        return res.status(400).json({
          success: false,
          error: 'Prompt is required'
        });
      }

      const result = await OllamaService.generateResponse(prompt, modelName, options);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async generateEmbedding(req, res) {
    try {
      const { text, modelName } = req.body;

      if (!text) {
        return res.status(400).json({
          success: false,
          error: 'Text is required'
        });
      }

      const result = await OllamaService.generateEmbedding(text, modelName);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async createModel(req, res) {
    try {
      const { modelName, modelfile } = req.body;

      if (!modelName || !modelfile) {
        return res.status(400).json({
          success: false,
          error: 'Model name and modelfile are required'
        });
      }

      const result = await OllamaService.createModel(modelName, modelfile);
      
      res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async healthCheck(req, res) {
    try {
      const health = await OllamaService.healthCheck();
      
      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json({
        success: health.status === 'healthy',
        data: health
      });
    } catch (error) {
      res.status(503).json({
        success: false,
        error: error.message,
        status: 'unhealthy'
      });
    }
  }
}

module.exports = new OllamaController();
