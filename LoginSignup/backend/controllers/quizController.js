import Quiz from '../models/Quiz.js';
import StudentMastery from '../models/StudentMastery.js';
import QuizAttempt from '../models/QuizAttempt.js';
import CodeSubmission from '../models/CodeSubmission.js';
import Course from '../models/Course.js';
import { executeCodeInSandbox } from '../services/sandboxService.js';
import { checkPlagiarism } from '../services/plagiarismService.js';

export const createQuiz = async (req, res) => {
  try {
    const { title, description, courseId, topicTag, difficulty, questions, passingScorePercent } = req.body;

    if (!title || !courseId || !topicTag) {
      return res.status(400).json({ success: false, message: 'Title, courseId, and topicTag are required' });
    }

    const quiz = new Quiz({
      title,
      description: description || '',
      courseId,
      topicTag,
      difficulty: difficulty || 'medium',
      questions: questions || [],
      passingScorePercent: passingScorePercent || 60
    });

    await quiz.save();

    // Optionally attach quiz as a lesson to course module
    const course = await Course.findById(courseId);
    if (course) {
      if (!course.modules || course.modules.length === 0) {
        course.modules = [{ title: 'Module 1: Core Lessons & Quizzes', order: 0, lessons: [] }];
      }
      const mod = course.modules[0];
      mod.lessons.push({
        title: `Quiz: ${title}`,
        type: 'quiz',
        quizId: quiz._id,
        topicTag: topicTag,
        difficulty: difficulty || 'medium',
        order: mod.lessons.length
      });
      await course.save();
    }

    return res.status(201).json({
      success: true,
      message: 'Quiz created successfully and attached to course',
      quiz
    });
  } catch (error) {
    console.error('Create quiz error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create quiz', error: error.message });
  }
};

export const getQuizzesByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const quizzes = await Quiz.find({ courseId });
    return res.status(200).json({ success: true, quizzes });
  } catch (error) {
    console.error('Fetch quizzes error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch quizzes', error: error.message });
  }
};

/**
 * Fetch a single quiz by ID with optional difficulty filtering
 */
export const getQuizById = async (req, res) => {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findById(id);

    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    return res.status(200).json({ success: true, quiz });
  } catch (error) {
    console.error('Fetch quiz by ID error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch quiz', error: error.message });
  }
};

/**
 * Run student code against test cases in VM Sandbox before final submission
 */
export const runCodeSandbox = async (req, res) => {
  try {
    const { userCode, testCases } = req.body;

    if (!userCode) {
      return res.status(400).json({ success: false, message: 'userCode is required' });
    }

    const sandboxResult = await executeCodeInSandbox(userCode, testCases || [], 3000);
    return res.status(200).json({ success: true, ...sandboxResult });
  } catch (error) {
    console.error('Sandbox execution error:', error);
    return res.status(500).json({ success: false, message: 'Failed to execute code in sandbox', error: error.message });
  }
};

/**
 * Submit Quiz Answers (Server-Driven Grading, Adaptive Mastery Calculation & Plagiarism Check)
 */
export const submitQuiz = async (req, res) => {
  try {
    const { quizId, answers } = req.body; // answers: [{ questionId, selectedOptionIndex, submittedCode }]
    const userId = req.user.id;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    let totalPoints = 0;
    let earnedPoints = 0;
    const answerRecords = [];

    for (const question of quiz.questions) {
      const qPoints = question.points || 10;
      totalPoints += qPoints;

      const studentAns = (answers || []).find(a => String(a.questionId) === String(question._id));

      if (question.type === 'mcq') {
        const selectedIdx = studentAns ? studentAns.selectedOptionIndex : null;
        const correctOpt = question.options.find(o => o.isCorrect);
        const correctIdx = question.options.findIndex(o => o.isCorrect);

        const isCorrect = selectedIdx !== null && selectedIdx === correctIdx;
        if (isCorrect) {
          earnedPoints += qPoints;
        }

        // Provide educational concept explanation (not just red X)
        const explanationText = isCorrect
          ? 'Correct! ' + (correctOpt?.explanation || 'Great job understanding this concept.')
          : `Incorrect. Correct Answer: "${correctOpt?.text || ''}". Explanation: ${question.explanation || correctOpt?.explanation || 'Review the core topic concept.'}`;

        answerRecords.push({
          questionId: question._id,
          selectedOptionIndex: selectedIdx,
          isCorrect,
          explanation: explanationText
        });
      } else if (question.type === 'code') {
        const submittedCode = studentAns ? studentAns.submittedCode : '';
        
        // Execute code in 3-second VM sandbox
        const sandboxRes = await executeCodeInSandbox(submittedCode, question.testCases || [], 3000);
        
        // Run plagiarism similarity check
        let plagRes = { similarityScorePercent: 0, plagiarismStatus: 'clean' };
        if (submittedCode.trim().length > 10) {
          plagRes = await checkPlagiarism(userId, quizId, question._id, submittedCode);
        }

        const isCorrect = sandboxRes.success;
        if (isCorrect) {
          earnedPoints += qPoints;
        }

        const explanationText = isCorrect
          ? `All ${sandboxRes.totalTestCases} test cases passed successfully!`
          : `Passed ${sandboxRes.passedTestCases} of ${sandboxRes.totalTestCases} test cases. ${sandboxRes.error || 'Check edge cases and logic syntax.'}`;

        answerRecords.push({
          questionId: question._id,
          submittedCode,
          isCorrect,
          explanation: explanationText,
          passedTestCases: sandboxRes.passedTestCases,
          totalTestCases: sandboxRes.totalTestCases
        });
      }
    }

    const scorePercent = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const passed = scorePercent >= (quiz.passingScorePercent || 60);

    // Fetch existing Student Mastery or initialize to default 50
    let masteryDoc = await StudentMastery.findOne({ userId, topicTag: quiz.topicTag });
    const masteryBefore = masteryDoc ? masteryDoc.masteryScore : 50;

    // Server-Driven Mastery Formula: NewScore = OldScore * 0.7 + QuizScore * 0.3
    const masteryAfter = Math.min(100, Math.max(0, Math.round(masteryBefore * 0.7 + scorePercent * 0.3)));

    if (!masteryDoc) {
      masteryDoc = new StudentMastery({
        userId,
        topicTag: quiz.topicTag,
        masteryScore: masteryAfter,
        totalAttempts: 1,
        lastEvaluatedAt: new Date()
      });
    } else {
      masteryDoc.masteryScore = masteryAfter;
      masteryDoc.totalAttempts += 1;
      masteryDoc.lastEvaluatedAt = new Date();
    }
    await masteryDoc.save();

    // Server decides next recommended difficulty based on masteryAfter
    let nextRecommendedDifficulty = 'medium';
    if (masteryAfter >= 75) {
      nextRecommendedDifficulty = 'harder';
    } else if (masteryAfter < 45) {
      nextRecommendedDifficulty = 'easier';
    }

    // Determine current attempt number
    const previousAttemptsCount = await QuizAttempt.countDocuments({ userId, quizId });

    // Save full QuizAttempt history for instructor review
    const quizAttempt = new QuizAttempt({
      userId,
      quizId,
      courseId: quiz.courseId,
      topicTag: quiz.topicTag,
      scorePercent,
      passed,
      masteryBefore,
      masteryAfter,
      nextRecommendedDifficulty,
      answers: answerRecords,
      attemptNumber: previousAttemptsCount + 1
    });

    await quizAttempt.save();

    return res.status(200).json({
      success: true,
      message: 'Quiz evaluated successfully',
      result: {
        scorePercent,
        passed,
        masteryBefore,
        masteryAfter,
        nextRecommendedDifficulty,
        attemptNumber: quizAttempt.attemptNumber,
        answers: answerRecords
      }
    });
  } catch (error) {
    console.error('Submit quiz error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit quiz', error: error.message });
  }
};

/**
 * Fetch Student Topic Mastery Scores
 */
export const getStudentMastery = async (req, res) => {
  try {
    const userId = req.user.id;
    const masteries = await StudentMastery.find({ userId });
    return res.status(200).json({ success: true, masteries });
  } catch (error) {
    console.error('Fetch student mastery error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch student mastery', error: error.message });
  }
};

/**
 * Instructor / Admin: Fetch Plagiarism Audit Report
 */
export const getPlagiarismReport = async (req, res) => {
  try {
    const { quizId } = req.params;
    const submissions = await CodeSubmission.find({ quizId })
      .populate('userId', 'name email username')
      .populate('maxMatchedStudentId', 'name email username')
      .sort({ similarityScorePercent: -1 });

    return res.status(200).json({ success: true, submissions });
  } catch (error) {
    console.error('Fetch plagiarism report error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch plagiarism report', error: error.message });
  }
};
