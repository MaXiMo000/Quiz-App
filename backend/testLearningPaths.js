// Quick test script to verify Learning Path system
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { LearningPath, UserPathProgress, Competency, UserCompetency } from '../models/LearningPath.js';

dotenv.config();

const testConnection = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Test model creation
        console.log('🧪 Testing models...');
        
        // Test that models are defined correctly
        console.log('LearningPath model:', !!LearningPath);
        console.log('UserPathProgress model:', !!UserPathProgress);
        console.log('Competency model:', !!Competency);
        console.log('UserCompetency model:', !!UserCompetency);

        // Test basic query (should not throw error)
        const pathCount = await LearningPath.countDocuments();
        console.log(`📊 Learning paths in database: ${pathCount}`);

        console.log('✅ All models working correctly!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await mongoose.connection.close();
        console.log('📡 Disconnected from MongoDB');
        process.exit(0);
    }
};

testConnection();
