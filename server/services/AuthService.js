const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
    this.saltRounds = 12;
  }

  async register(userData) {
    const { username, email, password } = userData;

    try {
      const existingUser = await User.findByEmail(email) || await User.findByUsername(username);
      if (existingUser) {
        throw new Error('User with this email or username already exists');
      }

      const password_hash = await bcrypt.hash(password, this.saltRounds);
      const user = await User.create({
        username,
        email,
        password_hash
      });

      const token = this.generateToken(user);
      return {
        success: true,
        user: this.sanitizeUser(user),
        token
      };
    } catch (error) {
      throw new Error(`Registration failed: ${error.message}`);
    }
  }

  async login(credentials) {
    const { email, password } = credentials;

    try {
      const user = await User.findByEmail(email);
      if (!user) {
        throw new Error('Invalid credentials');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      const token = this.generateToken(user);
      return {
        success: true,
        user: this.sanitizeUser(user),
        token
      };
    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  generateToken(user) {
    return jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        email: user.email 
      },
      this.jwtSecret,
      { expiresIn: this.jwtExpiresIn }
    );
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  sanitizeUser(user) {
    const { password_hash, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      const newPasswordHash = await bcrypt.hash(newPassword, this.saltRounds);
      await User.update(userId, { 
        username: user.username, 
        email: user.email,
        password_hash: newPasswordHash 
      });

      return { success: true, message: 'Password changed successfully' };
    } catch (error) {
      throw new Error(`Password change failed: ${error.message}`);
    }
  }

  async updateProfile(userId, updateData) {
    try {
      const { username, email } = updateData;
      
      if (email) {
        const existingUser = await User.findByEmail(email);
        if (existingUser && existingUser.id !== userId) {
          throw new Error('Email is already in use');
        }
      }
      
      if (username) {
        const existingUser = await User.findByUsername(username);
        if (existingUser && existingUser.id !== userId) {
          throw new Error('Username is already in use');
        }
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const updatedUser = await User.update(userId, {
        username: username || user.username,
        email: email || user.email
      });

      return {
        success: true,
        user: this.sanitizeUser(updatedUser)
      };
    } catch (error) {
      throw new Error(`Profile update failed: ${error.message}`);
    }
  }

  async deleteAccount(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      await User.delete(userId);
      return { success: true, message: 'Account deleted successfully' };
    } catch (error) {
      throw new Error(`Account deletion failed: ${error.message}`);
    }
  }

  extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  async refreshToken(token) {
    try {
      const decoded = this.verifyToken(token);
      const user = await User.findById(decoded.id);
      
      if (!user) {
        throw new Error('User not found');
      }

      const newToken = this.generateToken(user);
      return {
        success: true,
        token: newToken,
        user: this.sanitizeUser(user)
      };
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }
}

module.exports = new AuthService();
