import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Play, RotateCcw, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { runSandboxCode } from '../services/videoService.js';

export default function MonacoCodeEditor({ initialCode = '', testCases = [], onCodeChange }) {
  const defaultTemplate = '// Write your JavaScript solution below\nfunction solution(input) {\n  return input;\n}\n';
  const [code, setCode] = useState(initialCode || defaultTemplate);
  const [running, setRunning] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Propagate code to parent form on mount and code updates
  useEffect(() => {
    if (onCodeChange && code) {
      onCodeChange(code);
    }
  }, [code]);

  const handleEditorChange = (value) => {
    const val = value || '';
    setCode(val);
  };

  const handleReset = () => {
    const resetVal = initialCode || defaultTemplate;
    setCode(resetVal);
    setTestResults(null);
    setErrorMessage('');
    if (onCodeChange) onCodeChange(resetVal);
  };

  const handleRunTests = async () => {
    setRunning(true);
    setErrorMessage('');
    setTestResults(null);

    try {
      const res = await runSandboxCode({
        userCode: code,
        testCases
      });

      if (res.error) {
        setErrorMessage(res.error);
      }
      setTestResults(res);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to run code');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-xl space-y-0">
      {/* Monaco Editor Header Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block"></span>
          <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
          <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
          <span className="text-xs font-mono text-slate-400 ml-2">solution.js (Monaco Editor)</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            disabled={running}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            onClick={handleRunTests}
            disabled={running}
            className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition shadow cursor-pointer"
          >
            {running ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>Run Test Cases</span>
          </button>
        </div>
      </div>

      {/* Monaco Editor Component Instance */}
      <div className="relative bg-[#1e1e1e] min-h-[260px]">
        <Editor
          height="280px"
          defaultLanguage="javascript"
          language="javascript"
          theme="vs-dark"
          value={code}
          onChange={handleEditorChange}
          options={{
            fontSize: 13,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            lineNumbers: 'on',
            folding: true,
            formatOnType: true
          }}
          loading={
            <div className="flex items-center justify-center h-full text-slate-400 text-xs py-10">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400 mr-2" />
              <span>Loading Monaco Editor...</span>
            </div>
          }
        />
      </div>

      {/* Test Execution Output Console Panel */}
      {(testResults || errorMessage) && (
        <div className="bg-slate-900 border-t border-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Test Results</span>
            {testResults && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                testResults.success ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'
              }`}>
                Passed {testResults.passedTestCases} / {testResults.totalTestCases}
              </span>
            )}
          </div>

          {errorMessage && (
            <div className="bg-red-950/60 border border-red-800 text-red-300 p-3 rounded-lg text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {testResults?.results && testResults.results.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {testResults.results.map((res, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg border text-xs font-mono space-y-1 ${
                    res.passed
                      ? 'bg-emerald-950/30 border border-emerald-800/50 text-emerald-200'
                      : 'bg-red-950/30 border border-red-800/50 text-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      {res.passed ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      )}
                      Test Case {idx + 1}
                    </span>
                    <span className="text-[10px] uppercase font-semibold">
                      {res.passed ? 'PASSED' : 'FAILED'}
                    </span>
                  </div>

                  <div className="text-[11px] grid grid-cols-2 gap-2 pt-1 text-slate-300">
                    <div>
                      <span className="text-slate-500 block text-[10px]">INPUT</span>
                      <code>{res.input || 'N/A'}</code>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">EXPECTED</span>
                      <code>{res.expectedOutput}</code>
                    </div>
                  </div>

                  {!res.passed && (
                    <div className="text-[11px] pt-1 text-red-300 border-t border-red-900/50 mt-1">
                      <span className="text-slate-500 block text-[10px]">ACTUAL OUTPUT / ERROR</span>
                      <code>{res.error || res.actualOutput || 'Undefined'}</code>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
