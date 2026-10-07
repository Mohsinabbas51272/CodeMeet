"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import Editor, { OnMount } from '@monaco-editor/react';
import { Mic, MicOff, Video, VideoOff, MonitorUp, MessageSquare, Terminal as TerminalIcon, Users, Sparkles, Send, X, Code, Shield, Network, FileText, Download, GitBranch, GitPullRequest, Palette, Eraser, Volume2, VolumeX, Eye, Radio } from 'lucide-react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

export default function MeetingRoom() {
  const params = useParams();
  const roomId = params.id as string;
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [code, setCode] = useState('// Start coding here...\n\nfunction helloWorld() {\n  console.log("Welcome to CodeMeet!");\n}');
  const [messages, setMessages] = useState<{username: string, text: string, time: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [agentVoiceEnabled, setAgentVoiceEnabled] = useState(true);

  // Real-Time Voice Talk to AI Agent State
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  const [activeTab, setActiveTab] = useState<'code' | 'terminal' | 'diagram' | 'docs' | 'whiteboard'>('code');

  // Video and Screen Share Refs
  const userVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const userVideoStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Security Permissions Mode
  const [permissionMode, setPermissionMode] = useState<'edit' | 'suggest' | 'readonly'>('edit');

  // Multi-Agent Selector State
  const [selectedAgentRole, setSelectedAgentRole] = useState<'senior' | 'backend' | 'frontend' | 'devops' | 'security' | 'database'>('senior');

  // Git State
  const [currentBranch, setCurrentBranch] = useState('main');
  const [gitModalOpen, setGitModalOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [gitStatusMessage, setGitStatusMessage] = useState('');

  // AI Dialog state
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiPromptInput, setAiPromptInput] = useState('');
  const [aiThinking, setAiThinking] = useState(false);

  // Live Architecture Diagram State
  const [architectureDiagram, setArchitectureDiagram] = useState<string>(`graph TD
  User[Developer Browser] -->|Next.js App / Monaco| FE[Frontend React]
  FE -->|Socket.io WebSockets| WS[NestJS Gateway :3001]
  WS -->|node-pty| PTY[Shared Terminal Session]
  WS -->|AiService| AI[AI Orchestration Engine]
  WS -->|Prisma ORM| DB[(SQLite / PostgreSQL)]`);

  // Generated Documentation State
  const [docContent, setDocContent] = useState<string>('# Technical Specification\nSelect "Generate Docs" to compile instant Markdown documentation for this project.');

  // Whiteboard Canvas State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('#818cf8');

  // Monaco Editor & AI Cursor refs
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);
  
  const terminalRef = useRef<HTMLDivElement>(null);
  const termInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  
  // Dev username state (SSR Hydration Safe)
  const [username, setUsername] = useState("DevUser");

  useEffect(() => {
    setUsername("DevUser_" + Math.floor(Math.random() * 1000));
  }, []);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  };

  // Agent Voice Text-To-Speech Synthesis
  const speakAiText = (text: string) => {
    if (agentVoiceEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[\*\_`#]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Real-Time Speech Recognition (Voice Input to AI Agent)
  const toggleVoiceTalk = () => {
    if (isVoiceListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsVoiceListening(false);
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Speech Recognition is not supported in this browser. Try Google Chrome!");
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsVoiceListening(true);
        setVoiceTranscript('Listening to your voice...');
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setVoiceTranscript(transcript);

        if (event.results[0].isFinal) {
          setIsVoiceListening(false);
          if (transcript.trim()) {
            handleAskAi(transcript.trim());
          }
        }
      };

      recognition.onerror = (err: any) => {
        console.error("Speech recognition error:", err);
        setIsVoiceListening(false);
      };

      recognition.onend = () => {
        setIsVoiceListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    }
  };

  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to WebSocket server');
      newSocket.emit('join-room', { roomId, username });
    });

    newSocket.on('chat-message', (data: { username: string, message: string, timestamp: string }) => {
      setMessages((prev) => [...prev, { username: data.username, text: data.message, time: new Date(data.timestamp).toLocaleTimeString() }]);
      setAiThinking(false);

      if (data.username.startsWith('AI')) {
        speakAiText(data.message);
      }
    });

    newSocket.on('code-change', (data: { code: string }) => {
      if (permissionMode !== 'readonly') {
        setCode(data.code);
      }
    });

    newSocket.on('architecture-update', (data: { diagram: string }) => {
      setArchitectureDiagram(data.diagram);
    });

    newSocket.on('user-joined', (data: { username: string }) => {
      setMessages((prev) => [...prev, { username: 'System', text: `${data.username} joined the room.`, time: new Date().toLocaleTimeString() }]);
    });

    newSocket.on('terminal-output', (data: string) => {
      if (termInstance.current) {
        termInstance.current.write(data);
      }
    });

    newSocket.on('ai-thinking', () => {
      setAiThinking(true);
    });

    newSocket.on('ai-cursor-move', (data: { line: number; label: string }) => {
      if (editorRef.current && monacoRef.current) {
        const monaco = monacoRef.current;
        const editor = editorRef.current;

        decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [
          {
            range: new monaco.Range(data.line, 1, data.line, 100),
            options: {
              isWholeLine: true,
              className: 'bg-indigo-500/20 border-l-4 border-indigo-500',
              glyphMarginClassName: 'bg-indigo-500',
              hoverMessage: { value: `✨ AI (${selectedAgentRole.toUpperCase()}) is inspecting this section` }
            }
          }
        ]);

        editor.revealLineInCenter(data.line);
      }
    });

    newSocket.on('ai-cursor-clear', () => {
      if (editorRef.current) {
        decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [roomId, username, permissionMode, selectedAgentRole, agentVoiceEnabled]);

  // Handle Real Webcam Feed
  const handleToggleCam = async () => {
    if (camOn) {
      if (userVideoStreamRef.current) {
        userVideoStreamRef.current.getTracks().forEach(track => track.stop());
        userVideoStreamRef.current = null;
      }
      setCamOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        userVideoStreamRef.current = stream;
        setCamOn(true);
        setTimeout(() => {
          if (userVideoRef.current) {
            userVideoRef.current.srcObject = stream;
          }
        }, 100);
      } catch (e) {
        console.error("Camera access failed or denied:", e);
        setCamOn(true);
      }
    }
  };

  // Handle Real Screen Sharing
  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        screenStreamRef.current = stream;
        setIsScreenSharing(true);
        
        setTimeout(() => {
          if (screenVideoRef.current) {
            screenVideoRef.current.srcObject = stream;
          }
        }, 100);

        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          screenStreamRef.current = null;
        };
      } catch (e) {
        console.error("Screen sharing cancelled or failed:", e);
      }
    }
  };

  // Terminal initialization
  useEffect(() => {
    if (activeTab === 'terminal' && terminalRef.current && !termInstance.current) {
      const term = new Terminal({
        theme: {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
          cursor: '#ffffff',
        },
        fontFamily: 'var(--font-geist-mono), monospace',
        fontSize: 14,
      });
      
      const fit = new FitAddon();
      term.loadAddon(fit);
      
      term.open(terminalRef.current);
      fit.fit();
      
      termInstance.current = term;
      fitAddon.current = fit;
      
      term.onData((data) => {
        if (socket && permissionMode !== 'readonly') {
          socket.emit('terminal-input', { roomId, input: data });
        }
      });
      
      const handleResize = () => {
        fit.fit();
        if (socket) {
          socket.emit('terminal-resize', { roomId, cols: term.cols, rows: term.rows });
        }
      };
      
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        term.dispose();
        termInstance.current = null;
      };
    }
  }, [activeTab, socket, roomId, permissionMode]);

  // Whiteboard drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined && permissionMode !== 'readonly') {
      setCode(value);
      if (socket) {
        socket.emit('code-change', { roomId, code: value });
      }
    }
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket) return;
    
    socket.emit('chat-message', { roomId, message: chatInput, username });
    setMessages((prev) => [...prev, { username: 'You', text: chatInput, time: new Date().toLocaleTimeString() }]);
    setChatInput('');
  };

  const handleAskAi = (presetPrompt?: string) => {
    const promptToSend = presetPrompt || aiPromptInput;
    if (!promptToSend.trim() || !socket) return;

    setAiThinking(true);
    socket.emit('ai-prompt', {
      roomId,
      prompt: promptToSend,
      code,
      filename: 'index.ts',
      agentRole: selectedAgentRole,
    });

    setAiPromptInput('');
    setAiModalOpen(false);
  };

  const handleGenerateDocs = async () => {
    try {
      const res = await fetch('http://localhost:3001/ai/docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: 'index.ts', code }),
      });
      const data = await res.json();
      setDocContent(data.docs);
      setActiveTab('docs');
    } catch (e) {
      console.error('Failed to generate docs', e);
    }
  };

  const handleDownloadDocs = () => {
    const element = document.createElement("a");
    const file = new Blob([docContent], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = "CodeMeet_Documentation.md";
    document.body.appendChild(element);
    element.click();
  };

  const handleCreateGitPR = (e: React.FormEvent) => {
    e.preventDefault();
    setGitStatusMessage("Creating Pull Request...");
    setTimeout(() => {
      setGitStatusMessage(`✅ Pull Request #42 opened successfully for branch '${currentBranch}'!`);
      setTimeout(() => {
        setGitModalOpen(false);
        setGitStatusMessage('');
        setCommitMessage('');
      }, 1500);
    }, 1000);
  };

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-50 overflow-hidden font-[family-name:var(--font-geist-sans)]">
      
      {/* Left Sidebar - Videos & Agents */}
      <div className="w-64 border-r border-neutral-900 bg-neutral-950 flex flex-col">
        <div className="p-4 border-b border-neutral-900 flex justify-between items-center">
          <h2 className="font-semibold flex items-center gap-2 text-sm">
            <Users size={16} className="text-indigo-400" />
            Participants
          </h2>
          <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20">
            Live
          </span>
        </div>

        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          {/* Main User Video Stream */}
          <div className="aspect-video bg-neutral-900 rounded-lg border border-neutral-800 flex items-center justify-center relative overflow-hidden group">
            {camOn ? (
              <video 
                ref={userVideoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-xl shadow-lg">
                {username.charAt(0)}
              </div>
            )}
            {micOn && (
              <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                <Volume2 size={12} className="text-emerald-400 animate-pulse" />
                <span className="text-[9px] text-emerald-300 font-semibold">Speaking</span>
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs backdrop-blur-sm">
              You ({username})
            </div>
          </div>

          {/* Active AI Agent Card */}
          <div className="aspect-video bg-indigo-950/30 rounded-lg border border-indigo-900/50 flex flex-col items-center justify-center relative shadow-[0_0_15px_rgba(79,70,229,0.15)] group p-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-500/30 relative">
              <Sparkles size={18} className="text-white" />
              {aiThinking && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                </span>
              )}
            </div>
            <span className="text-xs font-semibold mt-1.5 text-indigo-200 capitalize">
              {selectedAgentRole} Specialist
            </span>
            {aiThinking && (
              <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-purple-500/20 border border-purple-500/30 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                <Volume2 size={12} className="text-purple-400 animate-pulse" />
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] backdrop-blur-sm flex items-center gap-1 text-indigo-300">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
              </span>
              {aiThinking ? 'Thinking & Speaking...' : 'Active Co-Pilot'}
            </div>
          </div>

          {/* Real-Time Voice Talk Button */}
          <button
            onClick={toggleVoiceTalk}
            className={`w-full py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition-all shadow-md ${
              isVoiceListening 
                ? 'bg-red-600 text-white border-red-500 animate-pulse shadow-red-500/30' 
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-purple-500 shadow-purple-500/20'
            }`}
          >
            <Radio size={14} className={isVoiceListening ? 'animate-spin' : ''} />
            <span>{isVoiceListening ? 'Listening Voice...' : 'Talk Live to AI Agent'}</span>
          </button>

          {/* Voice Transcript Floating Banner */}
          {isVoiceListening && (
            <div className="p-2.5 bg-purple-950/80 border border-purple-800 rounded-xl text-[11px] text-purple-200 animate-pulse leading-relaxed">
              <span className="font-semibold block text-purple-300">🎙️ Live Voice Input:</span>
              "{voiceTranscript}"
            </div>
          )}

          {/* Screen Share Status Widget */}
          {isScreenSharing && (
            <div className="p-2.5 bg-indigo-950/40 rounded-xl border border-indigo-500/30 flex items-center justify-between text-xs text-indigo-300">
              <span className="flex items-center gap-1.5 font-medium text-[11px]">
                <MonitorUp size={14} className="text-indigo-400 animate-pulse" />
                Sharing Screen
              </span>
              <button 
                onClick={handleToggleScreenShare}
                className="text-[10px] bg-red-500/20 text-red-400 hover:bg-red-500/30 px-2 py-0.5 rounded border border-red-500/30"
              >
                Stop
              </button>
            </div>
          )}

          {/* Security Permissions Widget */}
          <div className="p-3 bg-neutral-900/60 rounded-xl border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span className="flex items-center gap-1.5 font-medium">
                <Shield size={14} className="text-emerald-400" />
                Security Model
              </span>
              <span className="text-[10px] text-neutral-500">Strict</span>
            </div>

            <div className="grid grid-cols-3 gap-1 pt-1">
              <button 
                onClick={() => setPermissionMode('edit')}
                className={`py-1 text-[10px] font-medium rounded border transition-colors ${permissionMode === 'edit' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-neutral-800 text-neutral-400 border-neutral-700'}`}
              >
                Auto-Edit
              </button>
              <button 
                onClick={() => setPermissionMode('suggest')}
                className={`py-1 text-[10px] font-medium rounded border transition-colors ${permissionMode === 'suggest' ? 'bg-amber-600 text-white border-amber-500' : 'bg-neutral-800 text-neutral-400 border-neutral-700'}`}
              >
                Suggest
              </button>
              <button 
                onClick={() => setPermissionMode('readonly')}
                className={`py-1 text-[10px] font-medium rounded border transition-colors ${permissionMode === 'readonly' ? 'bg-red-600 text-white border-red-500' : 'bg-neutral-800 text-neutral-400 border-neutral-700'}`}
              >
                Read-Only
              </button>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-t border-neutral-900 flex justify-center gap-2.5">
          <button 
            onClick={() => setMicOn(!micOn)}
            title={micOn ? "Mute Microphone" : "Unmute Microphone"}
            className={`p-2.5 rounded-full transition-colors ${micOn ? 'bg-indigo-600 text-white shadow-md' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
          >
            {micOn ? <Mic size={18} /> : <MicOff size={18} />}
          </button>
          <button 
            onClick={handleToggleCam}
            title={camOn ? "Turn Camera Off" : "Turn Camera On"}
            className={`p-2.5 rounded-full transition-colors ${camOn ? 'bg-indigo-600 text-white shadow-md' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
          >
            {camOn ? <Video size={18} /> : <VideoOff size={18} />}
          </button>
          <button 
            onClick={handleToggleScreenShare}
            title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
            className={`p-2.5 rounded-full transition-colors ${isScreenSharing ? 'bg-emerald-600 text-white shadow-md' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
          >
            <MonitorUp size={18} />
          </button>
          <button 
            onClick={() => setAgentVoiceEnabled(!agentVoiceEnabled)}
            title={agentVoiceEnabled ? "Agent Voice Enabled" : "Agent Voice Muted"}
            className={`p-2.5 rounded-full transition-colors ${agentVoiceEnabled ? 'bg-purple-600 text-white shadow-md' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
          >
            {agentVoiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      </div>

      {/* Center - Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Workspace Tabs & Git Toolbar */}
        <div className="flex bg-neutral-900 border-b border-neutral-800 px-4 pt-2 gap-1 justify-between items-center">
          <div className="flex gap-1 overflow-x-auto">
            <button 
              onClick={() => setActiveTab('code')}
              className={`px-3 py-2 flex items-center gap-1.5 rounded-t-lg transition-colors text-xs font-medium ${activeTab === 'code' ? 'bg-neutral-950 text-indigo-400 border-t border-l border-r border-neutral-800' : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'}`}
            >
              <Code size={14} />
              index.ts
            </button>
            <button 
              onClick={() => setActiveTab('terminal')}
              className={`px-3 py-2 flex items-center gap-1.5 rounded-t-lg transition-colors text-xs font-medium ${activeTab === 'terminal' ? 'bg-neutral-950 text-emerald-400 border-t border-l border-r border-neutral-800' : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'}`}
            >
              <TerminalIcon size={14} />
              Shared Terminal
            </button>
            <button 
              onClick={() => setActiveTab('diagram')}
              className={`px-3 py-2 flex items-center gap-1.5 rounded-t-lg transition-colors text-xs font-medium ${activeTab === 'diagram' ? 'bg-neutral-950 text-purple-400 border-t border-l border-r border-neutral-800' : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'}`}
            >
              <Network size={14} />
              Architecture Diagram
            </button>
            <button 
              onClick={() => setActiveTab('whiteboard')}
              className={`px-3 py-2 flex items-center gap-1.5 rounded-t-lg transition-colors text-xs font-medium ${activeTab === 'whiteboard' ? 'bg-neutral-950 text-pink-400 border-t border-l border-r border-neutral-800' : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'}`}
            >
              <Palette size={14} />
              Shared Whiteboard
            </button>
            <button 
              onClick={() => setActiveTab('docs')}
              className={`px-3 py-2 flex items-center gap-1.5 rounded-t-lg transition-colors text-xs font-medium ${activeTab === 'docs' ? 'bg-neutral-950 text-amber-400 border-t border-l border-r border-neutral-800' : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'}`}
            >
              <FileText size={14} />
              Auto Docs
            </button>
          </div>

          <div className="pb-1 flex gap-2">
            <button 
              onClick={() => setGitModalOpen(true)}
              className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-3 py-1 rounded-lg text-xs font-medium border border-neutral-700 flex items-center gap-1.5 transition-colors"
            >
              <GitBranch size={13} className="text-emerald-400" />
              <span>{currentBranch}</span>
            </button>
            <button 
              onClick={handleGenerateDocs}
              className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-3 py-1 rounded-lg text-xs font-medium border border-neutral-700 flex items-center gap-1 transition-colors"
            >
              <FileText size={12} />
              Generate Docs
            </button>
            <button 
              onClick={() => setAiModalOpen(true)}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-3 py-1 rounded-lg text-xs font-semibold shadow-md flex items-center gap-1.5 transition-transform hover:scale-105"
            >
              <Sparkles size={14} />
              Ask AI Agent
            </button>
          </div>
        </div>

        {/* Editor & Main Content Area */}
        <div className="flex-1 bg-[#1e1e1e] relative flex flex-col">
          {/* Live Screen Share Stream Overlay Container */}
          {isScreenSharing && (
            <div className="absolute top-4 right-4 w-80 h-48 bg-neutral-950 border-2 border-indigo-500 rounded-xl shadow-2xl z-30 overflow-hidden flex flex-col">
              <div className="bg-indigo-900/60 px-3 py-1 text-[11px] font-semibold flex justify-between items-center text-white">
                <span className="flex items-center gap-1">
                  <Eye size={12} /> Live Shared Screen
                </span>
                <button onClick={handleToggleScreenShare} className="text-neutral-300 hover:text-white">✕</button>
              </div>
              <video 
                ref={screenVideoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-contain bg-black"
              />
            </div>
          )}

          {/* Code Tab */}
          <div className={`flex-1 ${activeTab === 'code' ? 'block' : 'hidden'}`}>
            <Editor
              height="100%"
              defaultLanguage="typescript"
              theme="vs-dark"
              value={code}
              onMount={handleEditorMount}
              onChange={handleEditorChange}
              options={{
                readOnly: permissionMode === 'readonly',
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: 'var(--font-geist-mono), monospace',
                padding: { top: 16 },
                cursorBlinking: 'smooth',
                smoothScrolling: true,
              }}
            />
          </div>
          
          {/* Terminal Tab */}
          <div 
            className={`flex-1 bg-[#1e1e1e] p-2 overflow-hidden ${activeTab === 'terminal' ? 'block' : 'hidden'}`} 
            ref={terminalRef}
          ></div>

          {/* Whiteboard Tab */}
          <div className={`flex-1 p-4 bg-neutral-900 flex flex-col ${activeTab === 'whiteboard' ? 'block' : 'hidden'}`}>
            <div className="flex justify-between items-center pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-pink-400 flex items-center gap-1">
                  <Palette size={14} /> Whiteboard Controls:
                </span>
                <div className="flex gap-1">
                  {['#818cf8', '#f43f5e', '#10b981', '#fbbf24', '#ffffff'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setDrawColor(color)}
                      style={{ backgroundColor: color }}
                      className={`w-5 h-5 rounded-full border border-neutral-700 ${drawColor === color ? 'ring-2 ring-white scale-110' : ''}`}
                    />
                  ))}
                </div>
              </div>
              <button 
                onClick={clearCanvas}
                className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs px-3 py-1 rounded-lg border border-neutral-700 flex items-center gap-1 transition-colors"
              >
                <Eraser size={12} />
                Clear Board
              </button>
            </div>
            <div className="flex-1 mt-3 bg-neutral-950 rounded-xl border border-neutral-800 overflow-hidden relative">
              <canvas
                ref={canvasRef}
                width={1000}
                height={600}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="w-full h-full cursor-crosshair"
              />
            </div>
          </div>

          {/* Architecture Diagram Tab */}
          <div className={`flex-1 p-6 bg-neutral-900 overflow-y-auto ${activeTab === 'diagram' ? 'block' : 'hidden'}`}>
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                <h3 className="text-sm font-bold flex items-center gap-2 text-purple-400">
                  <Network size={18} />
                  Live System Architecture Diagram
                </h3>
                <span className="text-[10px] bg-purple-500/10 text-purple-300 px-2 py-1 rounded border border-purple-500/20">
                  Auto-Updated by AI
                </span>
              </div>

              <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800 font-mono text-xs text-indigo-300 overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                {architectureDiagram}
              </div>
            </div>
          </div>

          {/* Docs Tab */}
          <div className={`flex-1 p-6 bg-neutral-900 overflow-y-auto ${activeTab === 'docs' ? 'block' : 'hidden'}`}>
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                <h3 className="text-sm font-bold flex items-center gap-2 text-amber-400">
                  <FileText size={18} />
                  Generated Architecture & API Specs
                </h3>
                <button 
                  onClick={handleDownloadDocs}
                  className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Download size={12} />
                  Export .md
                </button>
              </div>

              <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800 text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed">
                {docContent}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Right Sidebar - Chat & AI History */}
      <div className="w-80 border-l border-neutral-900 bg-neutral-950 flex flex-col">
        <div className="p-4 border-b border-neutral-900 flex justify-between items-center">
          <h2 className="font-semibold flex items-center gap-2 text-sm">
            <MessageSquare size={16} className="text-neutral-400" />
            Meeting Chat & AI Feed
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.username === 'You' ? 'items-end' : 'items-start'}`}>
              <div className="flex items-baseline gap-2 mb-1">
                <span className={`text-xs font-medium ${
                  msg.username === 'System' ? 'text-neutral-500' : 
                  msg.username === 'You' ? 'text-indigo-400' : 
                  msg.username.startsWith('AI') ? 'text-purple-400 font-bold' : 'text-neutral-300'
                }`}>
                  {msg.username}
                </span>
                <span className="text-[10px] text-neutral-600">{msg.time}</span>
              </div>
              <div className={`px-3 py-2 rounded-lg text-xs leading-relaxed max-w-[95%] break-words ${
                msg.username === 'System' ? 'bg-neutral-900 text-neutral-400 italic text-[11px] px-2 py-1' :
                msg.username === 'You' ? 'bg-indigo-600 text-white rounded-tr-none' : 
                msg.username.startsWith('AI') ? 'bg-purple-950/50 border border-purple-800/40 text-purple-100 rounded-tl-none font-sans' :
                'bg-neutral-800 text-neutral-200 rounded-tl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {aiThinking && (
            <div className="flex items-center gap-2 text-xs text-purple-400 animate-pulse bg-purple-950/30 p-2.5 rounded-lg border border-purple-900/40">
              <Sparkles size={14} className="animate-spin" />
              <span>AI ({selectedAgentRole.toUpperCase()}) is analyzing codebase & speaking...</span>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-neutral-900">
          <form onSubmit={sendMessage} className="relative">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Message team..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded-full px-4 py-2 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all pr-10"
            />
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full transition-colors disabled:opacity-50" disabled={!chatInput.trim()}>
              <Send size={12} />
            </button>
          </form>
        </div>
      </div>

      {/* Git Pull Request Modal */}
      {gitModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-base">
                <GitPullRequest size={18} />
                Open Pull Request
              </div>
              <button 
                onClick={() => setGitModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGitPR} className="space-y-3 pt-1">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Target Branch</label>
                <input 
                  type="text" 
                  value={currentBranch} 
                  onChange={(e) => setCurrentBranch(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Commit Message</label>
                <textarea 
                  required
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="feat: refactor pipeline and integrate AI Senior Engineer co-pilot..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white h-20 resize-none"
                />
              </div>

              {gitStatusMessage && (
                <div className="text-xs text-emerald-400 font-medium py-1">{gitStatusMessage}</div>
              )}

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl text-xs font-semibold shadow-md transition-colors"
              >
                Submit Pull Request
              </button>
            </form>
          </div>
        </div>
      )}

      {/* AI Co-Pilot Prompt Modal */}
      {aiModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold text-base">
                <Sparkles size={18} />
                Ask Specialized AI Agent
              </div>
              <button 
                onClick={() => setAiModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Specialist Role Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Select AI Specialist Role:</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'senior', label: '💡 Senior Lead' },
                  { id: 'backend', label: '⚙️ Backend' },
                  { id: 'frontend', label: '🎨 Frontend' },
                  { id: 'devops', label: '🚀 DevOps' },
                  { id: 'security', label: '🛡️ Security' },
                  { id: 'database', label: '🗄️ Database' },
                ].map((role) => (
                  <button
                    key={role.id}
                    onClick={() => setSelectedAgentRole(role.id as any)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-all text-left ${selectedAgentRole === role.id ? 'bg-indigo-600 text-white border-indigo-500 shadow-md' : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'}`}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Preset Actions */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button 
                onClick={() => handleAskAi("Fix bugs and handle errors")}
                className="bg-neutral-800 hover:bg-indigo-900/50 border border-neutral-700 text-neutral-200 text-xs px-2.5 py-1 rounded-full transition-all"
              >
                🐛 Fix Bugs
              </button>
              <button 
                onClick={() => handleAskAi("Optimize performance")}
                className="bg-neutral-800 hover:bg-indigo-900/50 border border-neutral-700 text-neutral-200 text-xs px-2.5 py-1 rounded-full transition-all"
              >
                🚀 Optimize
              </button>
              <button 
                onClick={() => handleAskAi("Audit security vulnerabilities")}
                className="bg-neutral-800 hover:bg-indigo-900/50 border border-neutral-700 text-neutral-200 text-xs px-2.5 py-1 rounded-full transition-all"
              >
                🛡️ Security Audit
              </button>
              <button 
                onClick={() => handleAskAi("Generate architecture diagram")}
                className="bg-neutral-800 hover:bg-indigo-900/50 border border-neutral-700 text-neutral-200 text-xs px-2.5 py-1 rounded-full transition-all"
              >
                Network Architecture Diagram
              </button>
            </div>

            <div className="space-y-2 pt-2">
              <textarea
                value={aiPromptInput}
                onChange={(e) => setAiPromptInput(e.target.value)}
                placeholder={`Ask the ${selectedAgentRole.toUpperCase()} AI Specialist anything...`}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 h-24 resize-none"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setAiModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAskAi()}
                  disabled={!aiPromptInput.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl text-xs font-semibold shadow-lg transition-transform active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send size={12} />
                  Ask {selectedAgentRole.toUpperCase()} AI
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
