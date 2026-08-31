import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Play, RotateCcw, CheckCircle2, XCircle, AlertTriangle, Loader2, Terminal, Code2 } from 'lucide-react';
import { runSandboxCode } from '../services/videoService.js';

export default function MonacoCodeEditor({ initialCode = '', testCases = [], onCodeChange }) {
  const defaultTemplate = '// Write your JavaScript solution below\nfunction solution(input) {\n  return input;\n}\n';
  const [code, setCode] = useState(initialCode || defaultTemplate);
  const [running, setRunning] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

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
    <div className="double-bezel">
      <div className="double-bezel-inner overflow-hidden shadow-2xl space-y-0">
        
        {/* Monaco Editor Header Bar with Machined Hardware Aesthetic */}
        <div className="bg-[#0a0d16] border-b border-white/[0.08] px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* macOS-style Window Controls */}
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 ring-1 ring-rose-400/40 inline-block"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 ring-1 ring-amber-400/40 inline-block"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 ring-1 ring-emerald-400/40 inline-block"></span>
            </div>
            
            {/* File Tab Indicator */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-slate-300">
              <Code2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>solution.js</span>
            </div>
          </div>

          {/* Action Pills */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              disabled={running}
              className="scale-press px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all border border-white/10 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3 h-3 text-slate-400" />
              <span>Reset</span>
            </button>
            <button
              onClick={handleRunTests}
              disabled={running}
              className="scale-press group px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-full text-xs font-semibold flex items-center gap-2 transition-all shadow-[0_4px_16px_rgba(16,185,129,0.3)] border border-emerald-400/30 cursor-pointer disabled:opacity-50"
            >
              {running ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Play className="w-2.5 h-2.5 fill-current" />
                </div>
              )}
              <span>Run Test Cases</span>
            </button>
          </div>
        </div>

        {/* Monaco Editor Component Instance */}
        <div className="relative bg-[#0d111a] min-h-[260px]">
          <Editor
            height="280px"
            defaultLanguage="javascript"
            language="javascript"
            theme="vs-dark"
            value={code}
            onChange={handleEditorChange}
            options={{
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, monospace",
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              lineNumbers: 'on',
              folding: true,
              formatOnType: true,
              renderLineHighlight: 'all',
              background: '#0d111a'
            }}
            loading={
              <div className="flex items-center justify-center h-full text-slate-400 text-xs py-10">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-400 mr-2" />
                <span>Initializing Sandbox...</span>
              </div>
            }
          />
        </div>

        {/* Test Execution Output Console Panel */}
        {(testResults || errorMessage) && (
          <div className="bg-[#080c14] border-t border-white/[0.08] p-5 space-y-4">
            
            {/* Header & Pass/Fail Ratio */}
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Test Suite Output</span>
              </div>
              {testResults && (
                <span className={`text-xs font-semibold px-3 py-0.5 rounded-full border tabular-nums flex items-center gap-1.5 ${
                  testResults.success 
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                    : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${testResults.success ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                  Passed {testResults.passedTestCases} / {testResults.totalTestCases}
                </span>
              )}
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3 rounded-xl text-xs flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Test Results List */}
            {testResults?.results && testResults.results.length > 0 && (
              <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                {testResults.results.map((res, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border text-xs font-mono space-y-2 transition-all ${
                      res.passed
                        ? 'bg-emerald-500/[0.04] border-emerald-500/20 text-emerald-200'
                        : 'bg-rose-500/[0.04] border-rose-500/20 text-rose-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-2">
                        {res.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        )}
                        <span>Test Case {idx + 1}</span>
                      </span>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                        res.passed 
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
                          : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      }`}>
                        {res.passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>

                    <div className="text-[11px] grid grid-cols-2 gap-3 pt-1 text-slate-300">
                      <div className="p-2 rounded-lg bg-black/40 border border-white/[0.04]">
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold mb-1">INPUT</span>
                        <code className="text-slate-200">{res.input || 'N/A'}</code>
                      </div>
                      <div className="p-2 rounded-lg bg-black/40 border border-white/[0.04]">
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold mb-1">EXPECTED</span>
                        <code className="text-slate-200">{res.expectedOutput}</code>
                      </div>
                    </div>

                    {!res.passed && (
                      <div className="text-[11px] p-2 rounded-lg bg-rose-950/30 border border-rose-900/40 text-rose-200 mt-1">
                        <span className="text-rose-400 block text-[10px] uppercase font-semibold mb-0.5">ACTUAL OUTPUT / ERROR</span>
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
    </div>
  );
}
