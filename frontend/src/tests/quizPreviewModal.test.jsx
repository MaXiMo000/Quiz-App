/**
 * QuizPreviewModal is rendered unconditionally by AIStudyBuddy, with
 * `quiz={modalData.quizPreview}` — which starts as `null` and becomes an object
 * when somebody previews a quiz. So the null -> set transition happens on the
 * same mounted instance, which is the one case where a hook below an early
 * return stops being a style question and becomes a crash.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { QuizPreviewModal } from '../components/AIStudyBuddyModals';

const QUIZ = {
  id: 'q1',
  title: 'Photosynthesis',
  questions: [
    { question: 'What does chlorophyll absorb?', options: ['Light', 'Water'], correctAnswer: 0 },
    { question: 'Where does it happen?', options: ['Chloroplast', 'Nucleus'], correctAnswer: 0 },
  ],
};

const noop = () => {};

describe('QuizPreviewModal', () => {
  it('renders nothing when there is no quiz to preview', () => {
    const { container } = render(
      <QuizPreviewModal isOpen={false} onClose={noop} quiz={null} onTakeQuiz={noop} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('survives the quiz arriving on an already-mounted instance', () => {
    // React matches hooks by call order. With the hook below `if (!quiz) return
    // null`, the first render registers none and the second registers one, and
    // React throws "Rendered more hooks than during the previous render" —
    // taking the tree down on the one interaction this component exists for.
    const { rerender } = render(
      <QuizPreviewModal isOpen={false} onClose={noop} quiz={null} onTakeQuiz={noop} />,
    );
    expect(() =>
      rerender(
        <QuizPreviewModal isOpen onClose={noop} quiz={QUIZ} onTakeQuiz={noop} />,
      ),
    ).not.toThrow();
    expect(screen.getByText('Photosynthesis')).toBeInTheDocument();
  });

  it('survives the quiz being cleared again', () => {
    // The closing half of the same transition, which unregisters the hook.
    const { rerender } = render(
      <QuizPreviewModal isOpen onClose={noop} quiz={QUIZ} onTakeQuiz={noop} />,
    );
    expect(() =>
      rerender(
        <QuizPreviewModal isOpen={false} onClose={noop} quiz={null} onTakeQuiz={noop} />,
      ),
    ).not.toThrow();
  });
});
