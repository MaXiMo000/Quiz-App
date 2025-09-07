import cacheService from './services/cacheService.js';
import { testConnection } from './config/redis.js';

async function clearQuizCache() {
  try {
    console.log('Testing Redis connection...');
    const connected = await testConnection();
    if (!connected) {
      console.log('❌ Redis not connected, skipping cache clear');
      return;
    }
    
    console.log('✅ Redis connected, clearing quiz cache...');
    
    // Clear all quiz-related cache
    const result1 = await cacheService.delPattern('api:GET:/quizzes*');
    console.log('Cleared api:GET:/quizzes* keys:', result1);
    
    const result2 = await cacheService.delPattern('*quizzes*');
    console.log('Cleared *quizzes* keys:', result2);
    
    const result3 = await cacheService.delPattern('*quiz*');
    console.log('Cleared *quiz* keys:', result3);
    
    const total = result1 + result2 + result3;
    console.log(`✅ Cache cleared successfully! Total keys cleared: ${total}`);
    
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
  }
  
  process.exit(0);
}

clearQuizCache();
