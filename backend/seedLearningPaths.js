import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { seedLearningPaths, seedCompetencies } from './utils/seedLearningPaths.js';

// Load environment variables
dotenv.config();

const seedDatabase = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('📡 Connected to MongoDB');

        // Seed learning paths
        await seedLearningPaths();
        await seedCompetencies();

        console.log('🎉 Database seeding completed successfully!');
        
    } catch (error) {
        console.error('❌ Error seeding database:', error);
    } finally {
        // Close the connection
        await mongoose.connection.close();
        console.log('📡 Disconnected from MongoDB');
        process.exit(0);
    }
};

// Run the seeding script
seedDatabase();
