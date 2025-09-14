import mongoose from 'mongoose';

const collaborativeSessionSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserQuiz',
    required: true,
  },
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true,
  },
  players: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserQuiz',
  }],
  status: {
    type: String,
    enum: ['waiting', 'in_progress', 'finished'],
    default: 'waiting',
  },
  settings: {
    maxPlayers: {
      type: Number,
      default: 8,
    },
    timePerQuestion: {
      type: Number,
      default: 30,
    },
  },
  history: [{
    type: Object,
  }],
}, {
  timestamps: true,
});

const CollaborativeSession = mongoose.model('CollaborativeSession', collaborativeSessionSchema);

export default CollaborativeSession;
