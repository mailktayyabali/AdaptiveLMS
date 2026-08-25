import CodeSubmission from '../models/CodeSubmission.js';

/**
 * Tokenize JavaScript code into normalized structure tokens for similarity comparison.
 */
export function tokenizeCode(codeString) {
  if (!codeString || typeof codeString !== 'string') return '';

  return codeString
    // Remove comments
    .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')
    // Replace strings with generic string placeholder
    .replace(/(["'])(?:(?=(\\?))\2[\s\S])*?\1/g, 'STR')
    // Replace numbers with generic num placeholder
    .replace(/\b\d+\b/g, 'NUM')
    // Normalize keywords vs identifier tokens
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate Jaccard Similarity Coefficient between two tokenized code strings using 3-gram sets.
 */
export function calculateJaccardSimilarity(tokens1, tokens2) {
  if (!tokens1 || !tokens2) return 0;

  const getNgrams = (str, n = 3) => {
    const ngrams = new Set();
    for (let i = 0; i <= str.length - n; i++) {
      ngrams.add(str.substring(i, i + n));
    }
    return ngrams;
  };

  const setA = getNgrams(tokens1);
  const setB = getNgrams(tokens2);

  if (setA.size === 0 || setB.size === 0) return 0;

  let intersectionSize = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersectionSize++;
    }
  }

  const unionSize = new Set([...setA, ...setB]).size;
  if (unionSize === 0) return 0;

  return Math.round((intersectionSize / unionSize) * 100);
}

/**
 * Check student submission for plagiarism against past submissions for the same question.
 * 
 * @param {string} studentId - Current submitting student user ID
 * @param {string} quizId - Quiz ID
 * @param {string} questionId - Question ID
 * @param {string} code - Submitted raw JavaScript code
 * @returns {Promise<{ similarityScorePercent: number, maxMatchedStudentId: string|null, plagiarismStatus: string }>}
 */
export async function checkPlagiarism(studentId, quizId, questionId, code) {
  const normalizedTokens = tokenizeCode(code);
  if (!normalizedTokens) {
    return { similarityScorePercent: 0, maxMatchedStudentId: null, plagiarismStatus: 'clean' };
  }

  // Fetch previous student submissions for this question (excluding current student)
  const previousSubmissions = await CodeSubmission.find({
    questionId,
    userId: { $ne: studentId }
  }).select('userId code normalizedTokens');

  let maxSimilarity = 0;
  let maxMatchedStudentId = null;

  for (const prev of previousSubmissions) {
    const prevTokens = prev.normalizedTokens || tokenizeCode(prev.code);
    const score = calculateJaccardSimilarity(normalizedTokens, prevTokens);

    if (score > maxSimilarity) {
      maxSimilarity = score;
      maxMatchedStudentId = prev.userId;
    }
  }

  let plagiarismStatus = 'clean';
  if (maxSimilarity >= 90) {
    plagiarismStatus = 'copied';
  } else if (maxSimilarity >= 70) {
    plagiarismStatus = 'suspicious';
  }

  // Save/record current code submission in database
  await CodeSubmission.create({
    userId: studentId,
    quizId,
    questionId,
    code,
    normalizedTokens,
    similarityScorePercent: maxSimilarity,
    maxMatchedStudentId,
    plagiarismStatus
  });

  return {
    similarityScorePercent: maxSimilarity,
    maxMatchedStudentId,
    plagiarismStatus
  };
}
