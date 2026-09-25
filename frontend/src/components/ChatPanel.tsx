"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Send, 
  Sparkles, 
  Satellite, 
  User, 
  Bot, 
  FileDown, 
  RefreshCw,
  Compass
} from "lucide-react";
import { QueryResponse } from "../types";

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  content: string;
  timestamp: string;
  queryResponse?: QueryResponse;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isProcessing: boolean;
  recommendedQueries: string[];
  onDownloadReport: () => void;
  hasResult: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSendMessage,
  isProcessing,
  recommendedQueries,
  onDownloadReport,
  hasResult
}) => {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessing) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  const handleQuickQuery = (q: string) => {
    if (isProcessing) return;
    onSendMessage(q);
  };

  return (
    <div className="space-chat flex flex-col h-full rounded-2xl glass-panel border border-slate-800 shadow-xl overflow-hidden">
      {/* Chat Header */}
      <div className="chat-console px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-cyan-400" />
          <div><h2 className="text-xs font-bold text-slate-200">Earth Observation Copilot</h2><p className="text-[9px] text-cyan-300/60 font-mono tracking-wider mt-0.5">NATURAL LANGUAGE MISSION INTERFACE</p></div>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Agent Active
        </span>
      </div>

      {/* Recommended Prompt Chips */}
      {recommendedQueries && recommendedQueries.length > 0 && (
        <div className="px-3 py-2 bg-slate-950/60 border-b border-slate-800/80 overflow-x-auto flex items-center gap-1.5 scrollbar-none">
          <Compass className="w-3 h-3 text-cyan-400 shrink-0 mr-0.5" />
          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider shrink-0">
            Suggested:
          </span>
          {recommendedQueries.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickQuery(q)}
              disabled={isProcessing}
              className="text-[11px] px-2.5 py-1 rounded-full bg-slate-900 hover:bg-cyan-950/80 text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-700/80 shrink-0 transition cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-300">Ask any Remote Sensing Question</p>
              <p className="text-[11px] text-slate-500 max-w-xs mt-1">
                "Show the river", "Has vegetation increased?", "What land-cover classes are visible?", or "Detect flooded areas using SAR".
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 text-xs leading-relaxed ${
                msg.sender === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                  msg.sender === "user"
                    ? "bg-slate-700 text-slate-200"
                    : "bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/20"
                }`}
              >
                {msg.sender === "user" ? <User className="w-4 h-4" /> : <Satellite className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[85%] rounded-2xl p-3.5 space-y-2 shadow-sm ${
                  msg.sender === "user"
                    ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none font-medium"
                    : "bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none"
                }`}
              >
                <div className="whitespace-pre-line leading-relaxed font-sans">
                  {msg.content}
                </div>

                {msg.queryResponse && (
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span className="text-cyan-400 font-semibold">
                      Pipeline: {msg.queryResponse.selected_model.split("(")[0]}
                    </span>
                    <span className="text-emerald-400 font-bold">
                      {msg.queryResponse.confidence_score}% Conf.
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex gap-3 text-xs">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <RefreshCw className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl rounded-tl-none p-3.5 space-y-1 text-slate-300">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold text-[11px]">
                <span>Agent Reasoning in Progress...</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Extracting deep spectral indices, routing query to specialist ensemble, and synthesizing spatial evidence.
              </p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Query Input Box */}
      <form onSubmit={handleSubmit} className="chat-input p-3 bg-slate-900/90 border-t border-slate-800">
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask a question about the imagery (e.g. 'Show the river', 'What changed?')..."
            disabled={isProcessing}
            className="w-full bg-slate-950 border border-slate-700/80 focus:border-cyan-400 rounded-xl pl-3.5 pr-12 py-2.5 text-xs text-slate-200 placeholder:text-slate-500 outline-none transition shadow-inner"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isProcessing}
            className={`absolute right-1.5 p-2 rounded-lg transition ${
              inputText.trim() && !isProcessing
                ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 glow-cyan cursor-pointer"
                : "text-slate-600 cursor-not-allowed"
            }`}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
};
