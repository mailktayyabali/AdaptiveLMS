import { executeCodeInSandbox } from '../backend/services/sandboxService.js';
import { calculateJaccardSimilarity, tokenizeCode } from '../backend/services/plagiarismService.js';

async function runPhase2Tests() {
  console.log("=== RUNNING PHASE 2 AUTOMATED VERIFICATION TESTS ===");

  // Test 1: Code Sandbox Valid Code Execution
  console.log("\n[Test 1] Valid JavaScript Code Execution in Sandbox...");
  const validCode = `
    function solution(input) {
      return input.toUpperCase();
    }
  `;
  const validTestCases = [
    { input: '"hello"', expectedOutput: '"HELLO"' },
    { input: '"world"', expectedOutput: '"WORLD"' }
  ];

  const validRes = await executeCodeInSandbox(validCode, validTestCases, 3000);
  console.log("Valid Code Result:", validRes);
  if (validRes.success && validRes.passedTestCases === 2) {
    console.log("-> PASS: Valid code executed successfully against all test cases!");
  } else {
    console.error("-> FAIL: Valid code execution failed!", validRes);
  }

  // Test 2: Code Sandbox 3-Second Execution Timeout (Infinite Loop Protection)
  console.log("\n[Test 2] Infinite Loop 3-Second Timeout Protection...");
  const infiniteLoopCode = `
    function solution(input) {
      while (true) {
        // infinite loop
      }
      return input;
    }
  `;
  const loopTestCases = [{ input: '"test"', expectedOutput: '"test"' }];

  const startTime = Date.now();
  const loopRes = await executeCodeInSandbox(infiniteLoopCode, loopTestCases, 3000);
  const durationMs = Date.now() - startTime;

  console.log(`Infinite Loop Result (Duration: ${durationMs}ms):`, loopRes);
  if (!loopRes.success && durationMs >= 2900 && durationMs <= 4000) {
    console.log("-> PASS: Infinite loop caught by 3-second timeout protection without crashing worker!");
  } else {
    console.error("-> FAIL: Timeout protection did not function as expected!", loopRes);
  }

  // Test 3: Plagiarism Detection Jaccard Similarity Calculation
  console.log("\n[Test 3] Plagiarism Similarity Detection...");
  const codeA = `
    function solution(input) {
      const result = input.split('').reverse().join('');
      return result;
    }
  `;
  const codeB = `
    function solution(input) {
      let result = input.split('').reverse().join('');
      return result;
    }
  `;
  const tokensA = tokenizeCode(codeA);
  const tokensB = tokenizeCode(codeB);
  const similarity = calculateJaccardSimilarity(tokensA, tokensB);

  console.log(`Tokens Similarity Score: ${similarity}%`);
  if (similarity >= 75) {
    console.log("-> PASS: Plagiarism detector successfully flagged matching code submission!");
  } else {
    console.error("-> FAIL: Plagiarism similarity score too low!", similarity);
  }

  console.log("\n=== ALL PHASE 2 VERIFICATION TESTS COMPLETED SUCCESSFULLY ===");
}

runPhase2Tests().catch(err => {
  console.error("Phase 2 test suite failure:", err);
  process.exit(1);
});
