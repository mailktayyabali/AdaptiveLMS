import { runInNewContext } from 'vm';

/**
 * Execute student JavaScript code against test cases inside a sandboxed VM with a strict 3-second timeout.
 * Prevents infinite loops (while(true)) from freezing the Node process.
 * 
 * @param {string} userCode - JavaScript code submitted by student
 * @param {Array<{ input: string, expectedOutput: string }>} testCases - List of test cases
 * @param {number} timeoutMs - Max execution timeout in milliseconds (default 3000ms)
 * @returns {Promise<{ success: boolean, passedTestCases: number, totalTestCases: number, results: Array, error?: string }>}
 */
export async function executeCodeInSandbox(userCode, testCases = [], timeoutMs = 3000) {
  if (!userCode || typeof userCode !== 'string') {
    return {
      success: false,
      passedTestCases: 0,
      totalTestCases: testCases.length,
      results: [],
      error: 'Invalid code input'
    };
  }

  // Basic security check: disallow process, require, import, fs, child_process, globalThis access
  const forbiddenPatterns = [/process\./, /require\s*\(/, /import\s+/, /eval\s*\(/, /Function\s*\(/, /fs\./, /child_process/];
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(userCode)) {
      return {
        success: false,
        passedTestCases: 0,
        totalTestCases: testCases.length,
        results: [],
        error: 'Security violation: restricted system API usage detected'
      };
    }
  }

  const results = [];
  let passedCount = 0;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    const inputVal = testCase.input;
    const expected = (testCase.expectedOutput || '').trim();

    try {
      // Build safe execution wrapper around student function
      const runnerScript = `
        ${userCode}

        (function() {
          let inputData;
          try {
            inputData = JSON.parse(${JSON.stringify(inputVal)});
          } catch(e) {
            inputData = ${JSON.stringify(inputVal)};
          }

          if (typeof solution === 'function') {
            return solution(inputData);
          } else {
            throw new Error("Function 'solution' is not defined in your code");
          }
        })()
      `;

      // Safe VM context with 3-second timeout protection
      const sandboxContext = Object.create(null);
      sandboxContext.console = {
        log: () => {},
        error: () => {},
        warn: () => {}
      };
      sandboxContext.Math = Math;
      sandboxContext.JSON = JSON;
      sandboxContext.Array = Array;
      sandboxContext.Object = Object;
      sandboxContext.String = String;
      sandboxContext.Number = Number;
      sandboxContext.Boolean = Boolean;
      sandboxContext.parseInt = parseInt;
      sandboxContext.parseFloat = parseFloat;

      const rawResult = runInNewContext(runnerScript, sandboxContext, {
        timeout: timeoutMs,
        displayErrors: false
      });

      let actualOutput = '';
      if (typeof rawResult === 'object' && rawResult !== null) {
        actualOutput = JSON.stringify(rawResult);
      } else {
        actualOutput = String(rawResult !== undefined ? rawResult : '');
      }

      actualOutput = actualOutput.trim();

      // Compare output
      const isPassed = actualOutput === expected || actualOutput === expected.replace(/^"|"$/g, '');

      if (isPassed) {
        passedCount++;
      }

      results.push({
        testCaseIndex: i,
        input: inputVal,
        expectedOutput: expected,
        actualOutput,
        passed: isPassed
      });
    } catch (err) {
      let errorMessage = err.message;
      if (err.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT' || err.message.includes('timed out')) {
        errorMessage = 'Execution timed out (3-second limit exceeded - check for infinite loops)';
      }

      results.push({
        testCaseIndex: i,
        input: inputVal,
        expectedOutput: expected,
        actualOutput: 'Error',
        error: errorMessage,
        passed: false
      });
    }
  }

  return {
    success: passedCount === testCases.length,
    passedTestCases: passedCount,
    totalTestCases: testCases.length,
    results
  };
}
