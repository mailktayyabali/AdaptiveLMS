import { tokenizeCode, calculateJaccardSimilarity } from '../backend/services/plagiarismService.js';

console.log("====================================================");
console.log("      PLAGIARISM DETECTION ENGINE DEMO TEST        ");
console.log("====================================================\n");

// Student A Code Submission
const studentACode = `
  // Student A: Reverse string solution
  function solution(input) {
    const result = input.split('').reverse().join('');
    return result;
  }
`;

// Student B Code Submission (Copied code with changed variable names and added comments)
const studentBCode = `
  /* Student B: Copied submission with modified variable names */
  function solution(input) {
    let reversedText = input.split('').reverse().join('');
    return reversedText;
  }
`;

console.log("--- STUDENT A ORIGINAL SUBMISSION ---");
console.log(studentACode.trim());

console.log("\n--- STUDENT B COPIED SUBMISSION ---");
console.log(studentBCode.trim());

// Step 1: Tokenize both code snippets
const tokensA = tokenizeCode(studentACode);
const tokensB = tokenizeCode(studentBCode);

console.log("\n--- TOKENIZED CODE COMPARISON ---");
console.log("Student A Tokens:", tokensA);
console.log("Student B Tokens:", tokensB);

// Step 2: Calculate 3-gram Jaccard Similarity Index
const similarityScore = calculateJaccardSimilarity(tokensA, tokensB);

// Step 3: Determine Plagiarism Status
let status = 'clean';
if (similarityScore >= 90) {
  status = 'copied';
} else if (similarityScore >= 70) {
  status = 'suspicious';
}

console.log("\n====================================================");
console.log(`  SIMILARITY SCORE : ${similarityScore}%`);
console.log(`  PLAGIARISM STATUS: [ ${status.toUpperCase()} ]`);
console.log("====================================================\n");

if (similarityScore >= 70) {
  console.log("SUCCESS: Plagiarism Detector flagged Student B for copying Student A's logic!");
} else {
  console.log("Submission marked as clean.");
}
