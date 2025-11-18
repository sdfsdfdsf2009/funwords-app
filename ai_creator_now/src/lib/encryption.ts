import crypto from 'crypto';
import CryptoJS from 'crypto-js';

// 加密配置
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;

/**
 * 加密工具类
 * 提供API密钥和其他敏感数据的加密存储功能
 */
export class EncryptionUtils {
  /**
   * 使用Node.js crypto模块进行高强度加密
   */
  static encryptWithNodeCrypto(data: string): {
    encrypted: string;
    iv: string;
    salt: string;
    tag: string;
  } {
    // 生成随机盐值
    const salt = crypto.randomBytes(SALT_LENGTH);

    // 使用盐值派生密钥
    const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, 'sha256');

    // 生成随机IV
    const iv = crypto.randomBytes(IV_LENGTH);

    // 创建加密器
    const cipher = crypto.createCipher(ENCRYPTION_ALGORITHM, key);
    cipher.setAAD(Buffer.from('api-key-encryption'));

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      salt: salt.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  /**
   * 使用Node.js crypto模块进行解密
   */
  static decryptWithNodeCrypto(encryptedData: {
    encrypted: string;
    iv: string;
    salt: string;
    tag: string;
  }): string {
    try {
      // 重建盐值和IV
      const salt = Buffer.from(encryptedData.salt, 'hex');
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const tag = Buffer.from(encryptedData.tag, 'hex');

      // 派生密钥
      const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, 'sha256');

      // 创建解密器
      const decipher = crypto.createDecipher(ENCRYPTION_ALGORITHM, key);
      decipher.setAAD(Buffer.from('api-key-encryption'));
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error('DECRYPTION_FAILED');
    }
  }

  /**
   * 使用CryptoJS进行简单加密（向后兼容）
   */
  static encryptWithCryptoJS(data: string): string {
    return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
  }

  /**
   * 使用CryptoJS进行简单解密（向后兼容）
   */
  static decryptWithCryptoJS(encryptedData: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      throw new Error('DECRYPTION_FAILED');
    }
  }

  /**
   * 安全的哈希函数（用于密码等）
   */
  static secureHash(data: string, salt?: string): {
    hash: string;
    salt: string;
  } {
    const actualSalt = salt || crypto.randomBytes(SALT_LENGTH).toString('hex');
    const hash = crypto.pbkdf2Sync(data, actualSalt, 100000, 64, 'sha512').toString('hex');

    return {
      hash,
      salt: actualSalt
    };
  }

  /**
   * 验证哈希
   */
  static verifyHash(data: string, hash: string, salt: string): boolean {
    try {
      const computedHash = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha512').toString('hex');
      return computedHash === hash;
    } catch {
      return false;
    }
  }

  /**
   * 生成随机密钥
   */
  static generateRandomKey(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * 生成UUID
   */
  static generateUUID(): string {
    return crypto.randomUUID();
  }

  /**
   * 创建API密钥掩码（用于显示）
   */
  static maskApiKey(apiKey: string, visibleChars: number = 8): string {
    if (!apiKey || apiKey.length <= visibleChars) {
      return '***';
    }

    return apiKey.substring(0, visibleChars) + '***';
  }

  /**
   * 验证API密钥格式
   */
  static validateApiKeyFormat(apiKey: string, provider: string): boolean {
    if (!apiKey || apiKey.length < 16) {
      return false;
    }

    // 根据不同的提供商验证格式
    switch (provider.toLowerCase()) {
      case 'openai':
        return /^sk-[A-Za-z0-9]{48}$/.test(apiKey);
      case 'evolink':
        return /^sk-[A-Za-z0-9]{20,}$/.test(apiKey);
      case 'anthropic':
        return /^sk-ant-[A-Za-z0-9_-]{93}$/.test(apiKey);
      case 'google':
        return /^[A-Za-z0-9_-]{39}$/.test(apiKey);
      default:
        // 通用验证：至少16个字符，包含字母和数字
        return /^[A-Za-z0-9_-]{16,}$/.test(apiKey);
    }
  }

  /**
   * 创建数据校验和
   */
  static createChecksum(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * 验证数据完整性
   */
  static verifyIntegrity(data: string, checksum: string): boolean {
    const computedChecksum = this.createChecksum(data);
    return computedChecksum === checksum;
  }
}

/**
 * API密钥管理器
 * 专门处理API密钥的安全存储和检索
 */
export class ApiKeyManager {
  private static readonly ALGORITHM_VERSION = 'v1';

  /**
   * 加密API密钥用于数据库存储
   */
  static encryptApiKey(apiKey: string, provider: string): {
    encryptedData: string;
    algorithmVersion: string;
    provider: string;
    checksum: string;
    maskedKey: string;
  } {
    try {
      // 使用高强度加密
      const encrypted = EncryptionUtils.encryptWithNodeCrypto(apiKey);

      // 组合加密数据
      const encryptedData = JSON.stringify({
        encrypted: encrypted.encrypted,
        iv: encrypted.iv,
        salt: encrypted.salt,
        tag: encrypted.tag
      });

      // 创建校验和
      const checksum = EncryptionUtils.createChecksum(apiKey);

      // 创建掩码版本
      const maskedKey = EncryptionUtils.maskApiKey(apiKey);

      return {
        encryptedData,
        algorithmVersion: this.ALGORITHM_VERSION,
        provider,
        checksum,
        maskedKey
      };
    } catch (error) {
      console.error('Failed to encrypt API key:', error);
      throw new Error('API_KEY_ENCRYPTION_FAILED');
    }
  }

  /**
   * 解密API密钥
   */
  static decryptApiKey(encryptedData: string, checksum: string): string {
    try {
      // 解析加密数据
      const data = JSON.parse(encryptedData);

      // 解密
      const decrypted = EncryptionUtils.decryptWithNodeCrypto({
        encrypted: data.encrypted,
        iv: data.iv,
        salt: data.salt,
        tag: data.tag
      });

      // 验证完整性
      if (!EncryptionUtils.verifyIntegrity(decrypted, checksum)) {
        throw new Error('API_KEY_INTEGRITY_CHECK_FAILED');
      }

      return decrypted;
    } catch (error) {
      console.error('Failed to decrypt API key:', error);
      throw new Error('API_KEY_DECRYPTION_FAILED');
    }
  }

  /**
   * 验证API密钥的完整性和格式
   */
  static validateApiKey(apiKey: string, provider: string, originalChecksum?: string): {
    isValid: boolean;
    isFormatValid: boolean;
    isIntegrityValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    let isFormatValid = true;
    let isIntegrityValid = true;

    // 格式验证
    if (!EncryptionUtils.validateApiKeyFormat(apiKey, provider)) {
      isFormatValid = false;
      errors.push(`Invalid API key format for provider: ${provider}`);
    }

    // 完整性验证
    if (originalChecksum) {
      if (!EncryptionUtils.verifyIntegrity(apiKey, originalChecksum)) {
        isIntegrityValid = false;
        errors.push('API key integrity check failed');
      }
    }

    return {
      isValid: isFormatValid && isIntegrityValid,
      isFormatValid,
      isIntegrityValid,
      errors
    };
  }

  /**
   * 轮换API密钥
   */
  static rotateApiKey(oldEncryptedData: string, oldChecksum: string, newApiKey: string, provider: string): {
    newEncryptedData: string;
    newChecksum: string;
    rotationTimestamp: Date;
    maskedKey: string;
  } {
    try {
      // 验证旧密钥
      const oldKey = this.decryptApiKey(oldEncryptedData, oldChecksum);

      // 记录轮换操作
      console.log(`API key rotation initiated for provider: ${provider}`);

      // 加密新密钥
      const result = this.encryptApiKey(newApiKey, provider);

      return {
        newEncryptedData: result.encryptedData,
        newChecksum: result.checksum,
        rotationTimestamp: new Date(),
        maskedKey: result.maskedKey
      };
    } catch (error) {
      console.error('API key rotation failed:', error);
      throw new Error('API_KEY_ROTATION_FAILED');
    }
  }

  /**
   * 批量加密API密钥
   */
  static encryptMultipleApiKeys(apiKeys: Array<{
    apiKey: string;
    provider: string;
  }>): Array<{
    encryptedData: string;
    algorithmVersion: string;
    provider: string;
    checksum: string;
    maskedKey: string;
  }> {
    const results = [];

    for (const { apiKey, provider } of apiKeys) {
      try {
        const encrypted = this.encryptApiKey(apiKey, provider);
        results.push(encrypted);
      } catch (error) {
        console.error(`Failed to encrypt API key for ${provider}:`, error);
        // 可以选择跳过失败的密钥或抛出错误
        throw error;
      }
    }

    return results;
  }
}

/**
 * 安全配置管理器
 */
export class SecurityConfig {
  /**
   * 获取加密密钥（从环境变量或生成）
   */
  static getEncryptionKey(): string {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      console.warn('ENCRYPTION_KEY not set in environment variables. Using generated key.');
      return ENCRYPTION_KEY;
    }
    return key;
  }

  /**
   * 验证安全配置
   */
  static validateSecurityConfig(): {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // 检查必需的环境变量
    if (!process.env.ENCRYPTION_KEY) {
      warnings.push('ENCRYPTION_KEY not set, using generated key (not recommended for production)');
    }

    if (!process.env.JWT_SECRET) {
      errors.push('JWT_SECRET not set in environment variables');
    }

    if (!process.env.DATABASE_URL) {
      errors.push('DATABASE_URL not set in environment variables');
    }

    // 检查加密密钥强度
    const key = this.getEncryptionKey();
    if (key.length < 32) {
      warnings.push('ENCRYPTION_KEY should be at least 32 characters long');
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors
    };
  }
}

export default EncryptionUtils;