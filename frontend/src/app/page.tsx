"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Terminal, Users, Code, Video, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [meetingIdInput, setMeetingIdInput] = useState("");
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  const handleCreateMeeting = () => {
    const randomRoomId = "room-" + Math.random().toString(36).substring(2, 9);
    router.push(`/meeting/${randomRoomId}`);
  };

  const handleJoinMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingIdInput.trim()) return;
    router.push(`/meeting/${meetingIdInput.trim()}`);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMessage("Signing in...");
    setTimeout(() => {
      setAuthMessage("Signed in successfully as " + authEmail);
      setTimeout(() => {
        setAuthModalOpen(false);
        setAuthMessage("");
      }, 1000);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col font-[family-name:var(--font-geist-sans)] selection:bg-indigo-500/30">
      <header className="flex items-center justify-between p-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Code size={18} className="text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">CodeMeet</span>
        </div>
        <nav className="flex items-center gap-6">
          <a href="#features" className="text-neutral-400 hover:text-white transition-colors text-sm">Features</a>
          <button 
            onClick={() => setAuthModalOpen(true)}
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full text-sm font-medium transition-all"
          >
            Sign In
          </button>
        </nav>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-4xl mx-auto w-full mt-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-medium mb-8 border border-indigo-500/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          Next-Gen AI Developer Meeting Platform
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-gradient-to-br from-white via-neutral-200 to-neutral-500 bg-clip-text text-transparent">
          Code together. <br /> Debug instantly.
        </h1>
        
        <p className="text-lg md:text-xl text-neutral-400 mb-10 max-w-2xl">
          CodeMeet combines video conferencing, live code editing, remote terminal execution, and a Senior AI Software Engineer that joins your meetings.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
          <button 
            onClick={handleCreateMeeting}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-xl text-base font-semibold transition-transform active:scale-95 shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 group"
          >
            <Video size={18} className="group-hover:scale-110 transition-transform" />
            New Meeting
          </button>

          <form onSubmit={handleJoinMeeting} className="w-full sm:w-auto flex items-center bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 hover:border-neutral-700 transition-colors focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
            <span className="text-neutral-500 text-sm mr-2">code.meet/</span>
            <input 
              type="text" 
              value={meetingIdInput}
              onChange={(e) => setMeetingIdInput(e.target.value)}
              placeholder="meeting-id"
              className="bg-transparent border-none outline-none text-white text-sm w-24 sm:w-32 placeholder:text-neutral-600 focus:ring-0"
            />
            <button 
              type="submit" 
              disabled={!meetingIdInput.trim()}
              className="text-indigo-400 font-semibold text-sm ml-2 hover:text-indigo-300 disabled:opacity-40 transition-colors"
            >
              Join
            </button>
          </form>
        </div>

        <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-28 w-full text-left">
          <div className="p-6 rounded-2xl bg-neutral-900/50 border border-neutral-800 hover:bg-neutral-900 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
              <Code size={20} className="text-blue-400" />
            </div>
            <h3 className="font-semibold text-lg mb-2 text-white">Live Code Edit</h3>
            <p className="text-neutral-400 text-sm leading-relaxed">Collaborate in real-time with Monaco Editor integration. Sync code changes instantaneously across all clients.</p>
          </div>

          <div className="p-6 rounded-2xl bg-neutral-900/50 border border-neutral-800 hover:bg-neutral-900 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
              <Terminal size={20} className="text-emerald-400" />
            </div>
            <h3 className="font-semibold text-lg mb-2 text-white">Shared Terminal</h3>
            <p className="text-neutral-400 text-sm leading-relaxed">Execute native shell commands via node-pty and xterm.js directly in your browser.</p>
          </div>

          <div className="p-6 rounded-2xl bg-neutral-900/50 border border-neutral-800 hover:bg-neutral-900 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
              <Sparkles size={20} className="text-purple-400" />
            </div>
            <h3 className="font-semibold text-lg mb-2 text-white">Multi-Agent AI Engineer</h3>
            <p className="text-neutral-400 text-sm leading-relaxed">Invite specialized AI agents (Backend, Frontend, Security, DevOps) that highlight code and make live edits.</p>
          </div>
        </div>
      </main>
      
      <footer className="p-6 border-t border-neutral-900 mt-20 text-center">
        <p className="text-neutral-500 text-sm">© {new Date().getFullYear()} CodeMeet. Built for high-velocity software engineering teams.</p>
      </footer>

      {/* Auth Modal */}
      {authModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 font-bold text-lg text-white">
                <ShieldCheck className="text-indigo-500" size={20} />
                Sign In to CodeMeet
              </div>
              <button 
                onClick={() => setAuthModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-3 pt-2">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Email Address</label>
                <input 
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="developer@company.com"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Password</label>
                <input 
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {authMessage && (
                <div className="text-xs text-indigo-400 font-medium py-1">{authMessage}</div>
              )}

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-xs font-semibold shadow-md transition-colors"
              >
                Continue
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
