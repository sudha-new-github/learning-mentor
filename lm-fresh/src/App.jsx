import { useState, useRef, useEffect } from "react";
import { importGoogleDoc, importCourseLink, importExcelOrCSV } from "./plugins.js";

// ── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt(importedContent) {
  const base = `You are a warm, Socratic learning mentor. Your role is to help the user deeply understand any topic — not by lecturing, but by guiding them through questions, breaking things down, checking comprehension, and celebrating breakthroughs.

Your approach:
- Use the Socratic method: ask probing questions before explaining
- Break complex topics into digestible steps
- Use analogies, examples, and mental models
- Check understanding frequently
- Celebrate "aha moments" enthusiastically
- When stuck, offer hints before full explanations
- Warm, encouraging tone — never condescending
- End each response with a question, challenge, or next step

You are a mentor who walks alongside the learner, not a search engine.`;

  if (importedContent) {
    return `${base}

══ IMPORTED CONTENT ══
The user has imported the following material. Use it as the basis for your Socratic teaching. Draw questions, examples, and structure from this content. Guide the user to understand it deeply.

${importedContent}
══ END IMPORTED CONTENT ══

Start by briefly acknowledging what was imported, then ask: "What aspect of this would you like to explore first?" or dive into the most important concept with a Socratic question.`;
  }
  return base;
}

const SUGGESTED_TOPICS = [
  "How does the internet work?",
  "Explain compound interest",
  "What is machine learning?",
  "How do vaccines work?",
  "Teach me basic stoicism",
  "What is the Socratic method?",
];

// ── Icons ─────────────────────────────────────────────────────────────────────
const BookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
);
const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const PluginIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v6m0 0l-3-3m3 3l3-3"/><rect x="2" y="8" width="20" height="12" rx="2"/>
    <path d="M6 8v4m12-4v4"/>
  </svg>
);
const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const SparkleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
  </svg>
);

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: "flex", gap: "5px", alignItems: "center", padding: "4px 0" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: "50%", background: "#c8a96e",
          animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────
function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex", justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: "20px", animation: "fadeSlideIn 0.35s ease forwards",
    }}>
      {!isUser && (
        <div style={{
          width: 34, height: 34, borderRadius: "50%",
          background: "linear-gradient(135deg, #c8a96e, #8b6914)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginRight: 10, flexShrink: 0, marginTop: 2, color: "#fff",
          boxShadow: "0 2px 8px rgba(200,169,110,0.35)",
        }}>
          <BookIcon />
        </div>
      )}
      <div style={{
        maxWidth: "78%",
        background: isUser ? "linear-gradient(135deg, #2a1f0e, #3d2c10)" : "rgba(255,255,255,0.04)",
        border: isUser ? "1px solid rgba(200,169,110,0.3)" : "1px solid rgba(255,255,255,0.08)",
        borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        padding: "14px 18px",
        color: isUser ? "#f0e2c4" : "#e8dcc8",
        fontSize: "15px", lineHeight: "1.7",
        fontFamily: "'Crimson Pro', Georgia, serif",
        letterSpacing: "0.01em", whiteSpace: "pre-wrap", wordBreak: "break-word",
      }}>
        {msg.content}
      </div>
    </div>
  );
}

// ── Plugin Panel ──────────────────────────────────────────────────────────────
function PluginPanel({ onImport, onClose }) {
  const [tab, setTab] = useState("url"); // "url" | "file"
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState(null); // null | "loading" | "success" | "error"
  const [statusMsg, setStatusMsg] = useState("");
  const fileRef = useRef();

  const handleUrlImport = async () => {
    if (!url.trim()) return;
    setStatus("loading"); setStatusMsg("Fetching content...");
    try {
      let result;
      if (url.includes("docs.google.com") || url.includes("sheets.google.com")) {
        result = await importGoogleDoc(url);
      } else if (url.includes("coursera.org") || url.includes("udemy.com")) {
        result = await importCourseLink(url);
      } else {
        throw new Error("Paste a Google Docs, Google Sheets, Coursera, or Udemy URL.");
      }
      setStatus("success"); setStatusMsg(`Imported: "${result.title}"`);
      onImport(result);
    } catch (e) {
      setStatus("error"); setStatusMsg(e.message);
    }
  };

  const handleFileImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setStatus("loading"); setStatusMsg("Reading file...");
    try {
      const result = await importExcelOrCSV(file);
      setStatus("success"); setStatusMsg(`Imported: "${result.title}"`);
      onImport(result);
    } catch (e) {
      setStatus("error"); setStatusMsg(e.message);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
    }}>
      <div style={{
        background: "#120e06", border: "1px solid rgba(200,169,110,0.25)",
        borderRadius: "20px", padding: "28px", width: "min(480px, 92vw)",
        animation: "fadeSlideIn 0.3s ease forwards",
        boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ fontFamily: "'Cinzel', serif", color: "#c8a96e", fontSize: "16px", letterSpacing: "0.06em" }}>
            Import Learning Material
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(200,169,110,0.5)", cursor: "pointer", padding: "4px" }}>
            <CloseIcon />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          {[["url", "🔗 Link"], ["file", "📎 File Upload"]].map(([t, label]) => (
            <button key={t} onClick={() => { setTab(t); setStatus(null); }}
              style={{
                flex: 1, padding: "9px", borderRadius: "10px", cursor: "pointer",
                fontFamily: "'Crimson Pro', serif", fontSize: "14px",
                background: tab === t ? "rgba(200,169,110,0.15)" : "transparent",
                border: tab === t ? "1px solid rgba(200,169,110,0.4)" : "1px solid rgba(255,255,255,0.08)",
                color: tab === t ? "#c8a96e" : "rgba(200,169,110,0.4)",
                transition: "all 0.2s",
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* URL tab */}
        {tab === "url" && (
          <div>
            <div style={{ color: "rgba(200,169,110,0.5)", fontSize: "13px", marginBottom: "10px", fontFamily: "'Crimson Pro', serif" }}>
              Paste a Google Docs, Google Sheets, Coursera, or Udemy URL
            </div>
            <input
              value={url} onChange={e => setUrl(e.target.value)}
              placeholder="https://docs.google.com/..."
              style={{
                width: "100%", boxSizing: "border-box",
                background: "rgba(200,169,110,0.06)", border: "1px solid rgba(200,169,110,0.2)",
                borderRadius: "10px", padding: "11px 14px",
                color: "#e8dcc8", fontSize: "14px", fontFamily: "'Crimson Pro', serif",
                outline: "none",
              }}
              onKeyDown={e => e.key === "Enter" && handleUrlImport()}
            />
            <div style={{ color: "rgba(200,169,110,0.35)", fontSize: "12px", marginTop: "8px", fontFamily: "'Crimson Pro', serif" }}>
              Google Docs/Sheets must be set to "Anyone with the link can view"
            </div>
            <button onClick={handleUrlImport} disabled={status === "loading"}
              style={{
                marginTop: "14px", width: "100%", padding: "11px",
                background: "linear-gradient(135deg, #c8a96e, #8b6914)",
                border: "none", borderRadius: "10px", cursor: "pointer",
                color: "#0d0a05", fontFamily: "'Cinzel', serif", fontSize: "14px",
                letterSpacing: "0.05em", transition: "opacity 0.2s",
                opacity: status === "loading" ? 0.6 : 1,
              }}>
              {status === "loading" ? "Importing..." : "Import & Start Learning"}
            </button>
          </div>
        )}

        {/* File tab */}
        {tab === "file" && (
          <div>
            <div style={{ color: "rgba(200,169,110,0.5)", fontSize: "13px", marginBottom: "14px", fontFamily: "'Crimson Pro', serif" }}>
              Upload an Excel (.xlsx) or CSV file
            </div>
            <div
              onClick={() => fileRef.current.click()}
              style={{
                border: "2px dashed rgba(200,169,110,0.25)", borderRadius: "12px",
                padding: "36px 20px", textAlign: "center", cursor: "pointer",
                color: "rgba(200,169,110,0.4)", fontFamily: "'Crimson Pro', serif",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(200,169,110,0.5)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(200,169,110,0.25)"}
            >
              <div style={{ fontSize: "32px", marginBottom: "10px" }}>📊</div>
              <div>Click to select a file</div>
              <div style={{ fontSize: "12px", marginTop: "4px", color: "rgba(200,169,110,0.3)" }}>.xlsx, .xls, .csv</div>
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileImport} style={{ display: "none" }} />
          </div>
        )}

        {/* Status */}
        {status && status !== "loading" && (
          <div style={{
            marginTop: "14px", padding: "10px 14px", borderRadius: "10px",
            background: status === "success" ? "rgba(100,200,100,0.1)" : "rgba(200,80,80,0.1)",
            border: `1px solid ${status === "success" ? "rgba(100,200,100,0.3)" : "rgba(200,80,80,0.3)"}`,
            color: status === "success" ? "#90d090" : "#d09090",
            fontSize: "13px", fontFamily: "'Crimson Pro', serif",
          }}>
            {status === "success" ? "✓ " : "✗ "}{statusMsg}
            {status === "success" && <div style={{ marginTop: "4px", opacity: 0.7 }}>The mentor is ready. Close this panel to begin.</div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [showPlugin, setShowPlugin] = useState(false);
  const [importedContent, setImportedContent] = useState(null); // { title, content }
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("lm_api_key") || "");
  const [showApiInput, setShowApiInput] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleImport = (result) => {
    setImportedContent(result);
    setShowPlugin(false);
  };

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;

    if (!apiKey) {
      setShowApiInput(true);
      return;
    }

    setInput("");
    setStarted(true);
    const newMessages = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: buildSystemPrompt(importedContent?.content),
          messages: newMessages,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const reply = data.content?.find(b => b.type === "text")?.text || "Let me think about that...";
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages([...newMessages, { role: "assistant", content: `Something went wrong: ${e.message}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const saveApiKey = (key) => {
    setApiKey(key);
    localStorage.setItem("lm_api_key", key);
    setShowApiInput(false);
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#0d0a05",
      display: "flex", flexDirection: "column",
      fontFamily: "'Crimson Pro', Georgia, serif", position: "relative", overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Cinzel:wght@400;600&display=swap');
        * { box-sizing: border-box; }
        @keyframes bounce { 0%,80%,100%{transform:scale(0.8);opacity:0.5} 40%{transform:scale(1.2);opacity:1} }
        @keyframes fadeSlideIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes glowPulse { 0%,100%{opacity:0.4} 50%{opacity:0.7} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        textarea:focus { outline: none; }
        textarea::placeholder { color: rgba(200,169,110,0.35); }
        textarea { resize: none; }
        input:focus { outline: none; }
        .chip:hover { background:rgba(200,169,110,0.18)!important; border-color:rgba(200,169,110,0.6)!important; transform:translateY(-1px); color:#f0e2c4!important; }
        .send-btn:hover { background:#8b6914!important; transform:scale(1.05); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(200,169,110,0.25); border-radius: 4px; }
      `}</style>

      {/* Ambient background */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{
          position: "absolute", top: "-20%", left: "50%", transform: "translateX(-50%)",
          width: "600px", height: "600px",
          background: "radial-gradient(circle, rgba(139,105,20,0.12) 0%, transparent 70%)",
          animation: "glowPulse 4s ease-in-out infinite",
        }} />
      </div>

      {/* Header */}
      <div style={{
        position: "relative", zIndex: 10,
        padding: "18px 24px", borderBottom: "1px solid rgba(200,169,110,0.12)",
        display: "flex", alignItems: "center", gap: "12px",
        background: "rgba(13,10,5,0.85)", backdropFilter: "blur(12px)",
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          background: "linear-gradient(135deg, #c8a96e, #6b4e0c)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 20px rgba(200,169,110,0.3)",
          animation: "float 3s ease-in-out infinite", color: "#fff", flexShrink: 0,
        }}>
          <BookIcon />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "'Cinzel', serif", fontSize: "17px", fontWeight: "600",
            background: "linear-gradient(90deg, #c8a96e, #f0d99a, #c8a96e)",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            animation: "shimmer 4s linear infinite", letterSpacing: "0.08em",
          }}>Learning Mentor</div>
          <div style={{ fontSize: "11px", color: "rgba(200,169,110,0.45)", letterSpacing: "0.04em" }}>
            Socratic dialogue · guided discovery
            {importedContent && <span style={{ color: "#c8a96e", marginLeft: "8px" }}>· 📎 {importedContent.title}</span>}
          </div>
        </div>

        {/* Plugin button */}
        <button onClick={() => setShowPlugin(true)}
          style={{
            background: importedContent ? "rgba(200,169,110,0.15)" : "transparent",
            border: `1px solid ${importedContent ? "rgba(200,169,110,0.4)" : "rgba(200,169,110,0.2)"}`,
            borderRadius: "9px", color: importedContent ? "#c8a96e" : "rgba(200,169,110,0.4)",
            padding: "7px 13px", fontSize: "13px", cursor: "pointer",
            fontFamily: "'Crimson Pro', serif", display: "flex", alignItems: "center", gap: "6px",
            transition: "all 0.2s",
          }}>
          <PluginIcon /> Import
        </button>

        {/* API key button */}
        <button onClick={() => setShowApiInput(true)}
          style={{
            background: apiKey ? "rgba(100,200,100,0.08)" : "rgba(200,100,100,0.1)",
            border: `1px solid ${apiKey ? "rgba(100,200,100,0.25)" : "rgba(200,100,100,0.3)"}`,
            borderRadius: "9px", color: apiKey ? "#90d090" : "#d09090",
            padding: "7px 13px", fontSize: "13px", cursor: "pointer",
            fontFamily: "'Crimson Pro', serif", transition: "all 0.2s",
          }}>
          {apiKey ? "✓ API Key" : "Set API Key"}
        </button>

        {messages.length > 0 && (
          <button onClick={() => { setMessages([]); setStarted(false); setImportedContent(null); }}
            style={{
              background: "transparent", border: "1px solid rgba(200,169,110,0.15)",
              borderRadius: "9px", color: "rgba(200,169,110,0.4)", padding: "7px 13px",
              fontSize: "13px", cursor: "pointer", fontFamily: "'Crimson Pro', serif", transition: "all 0.2s",
            }}>
            New
          </button>
        )}
      </div>

      {/* API Key Modal */}
      {showApiInput && (
        <ApiKeyModal current={apiKey} onSave={saveApiKey} onClose={() => setShowApiInput(false)} />
      )}

      {/* Plugin Panel */}
      {showPlugin && <PluginPanel onImport={handleImport} onClose={() => setShowPlugin(false)} />}

      {/* Chat area */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "28px 24px",
        position: "relative", zIndex: 5,
        maxWidth: "780px", width: "100%", margin: "0 auto",
      }}>
        {!started ? (
          <div style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            minHeight: "55vh", textAlign: "center",
            animation: "fadeSlideIn 0.6s ease forwards",
          }}>
            <div style={{
              fontSize: "50px", marginBottom: "18px",
              filter: "drop-shadow(0 0 20px rgba(200,169,110,0.5))",
              animation: "float 3s ease-in-out infinite",
            }}>📖</div>
            <h2 style={{
              fontFamily: "'Cinzel', serif", fontSize: "26px", fontWeight: "400",
              color: "#c8a96e", margin: "0 0 10px", letterSpacing: "0.06em",
            }}>What shall we explore today?</h2>
            <p style={{
              color: "rgba(200,169,110,0.45)", fontSize: "15px", maxWidth: "400px",
              lineHeight: "1.7", margin: "0 0 10px", fontStyle: "italic",
            }}>
              "The mind is not a vessel to be filled, but a fire to be kindled." — Plutarch
            </p>
            <p style={{
              color: "rgba(200,169,110,0.35)", fontSize: "13px",
              margin: "0 0 30px",
            }}>
              Type a topic below, pick a suggestion, or import learning material via the Import button.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center", maxWidth: "540px" }}>
              {SUGGESTED_TOPICS.map(t => (
                <button key={t} className="chip" onClick={() => sendMessage(t)}
                  style={{
                    background: "rgba(200,169,110,0.08)", border: "1px solid rgba(200,169,110,0.22)",
                    borderRadius: "20px", color: "rgba(200,169,110,0.65)",
                    padding: "8px 16px", fontSize: "14px", cursor: "pointer",
                    fontFamily: "'Crimson Pro', serif", transition: "all 0.2s",
                  }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m, i) => <Message key={i} msg={m} />)}
            {loading && (
              <div style={{ display: "flex", alignItems: "flex-start", marginBottom: "20px" }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: "linear-gradient(135deg, #c8a96e, #8b6914)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginRight: 10, flexShrink: 0, color: "#fff",
                  boxShadow: "0 2px 8px rgba(200,169,110,0.35)",
                }}>
                  <BookIcon />
                </div>
                <div style={{
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "18px 18px 18px 4px", padding: "14px 18px",
                }}>
                  <TypingDots />
                </div>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{
        position: "relative", zIndex: 10, padding: "14px 24px 18px",
        borderTop: "1px solid rgba(200,169,110,0.1)",
        background: "rgba(13,10,5,0.88)", backdropFilter: "blur(12px)",
      }}>
        <div style={{ maxWidth: "780px", margin: "0 auto", display: "flex", gap: "12px", alignItems: "flex-end" }}>
          <div style={{
            flex: 1, background: "rgba(200,169,110,0.06)",
            border: "1px solid rgba(200,169,110,0.18)", borderRadius: "14px", padding: "11px 15px",
          }}>
            <textarea ref={textareaRef} value={input}
              onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
              placeholder={importedContent ? `Ask about "${importedContent.title}"...` : "Ask anything you want to learn..."}
              rows={1}
              style={{
                width: "100%", background: "transparent", border: "none",
                color: "#e8dcc8", fontSize: "15px", lineHeight: "1.6",
                fontFamily: "'Crimson Pro', Georgia, serif",
                minHeight: "24px", maxHeight: "120px", overflow: "auto",
              }}
              onInput={e => {
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
            />
          </div>
          <button className="send-btn" onClick={() => sendMessage()} disabled={!input.trim() || loading}
            style={{
              width: 44, height: 44, borderRadius: "12px",
              background: input.trim() && !loading ? "#c8a96e" : "rgba(200,169,110,0.15)",
              border: "none", cursor: input.trim() && !loading ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: input.trim() && !loading ? "#0d0a05" : "rgba(200,169,110,0.25)",
              transition: "all 0.2s", flexShrink: 0,
            }}>
            <SendIcon />
          </button>
        </div>
        <div style={{
          maxWidth: "780px", margin: "7px auto 0",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
          color: "rgba(200,169,110,0.25)", fontSize: "12px", fontFamily: "'Crimson Pro', serif",
        }}>
          <SparkleIcon />
          <span>Powered by Claude · Enter to send · Shift+Enter for new line</span>
        </div>
      </div>
    </div>
  );
}

// ── API Key Modal ─────────────────────────────────────────────────────────────
function ApiKeyModal({ current, onSave, onClose }) {
  const [val, setVal] = useState(current);
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)",
    }}>
      <div style={{
        background: "#120e06", border: "1px solid rgba(200,169,110,0.25)",
        borderRadius: "20px", padding: "28px", width: "min(420px, 92vw)",
        animation: "fadeSlideIn 0.3s ease forwards",
        boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
      }}>
        <div style={{ fontFamily: "'Cinzel', serif", color: "#c8a96e", fontSize: "16px", letterSpacing: "0.06em", marginBottom: "6px" }}>
          Anthropic API Key
        </div>
        <div style={{ color: "rgba(200,169,110,0.45)", fontSize: "13px", fontFamily: "'Crimson Pro', serif", marginBottom: "16px", lineHeight: "1.6" }}>
          Your key is stored only in your browser's localStorage and never sent anywhere except Anthropic's API.
          Get one at <span style={{ color: "#c8a96e" }}>console.anthropic.com</span>
        </div>
        <input
          value={val} onChange={e => setVal(e.target.value)}
          placeholder="sk-ant-..."
          type="password"
          style={{
            width: "100%", background: "rgba(200,169,110,0.06)",
            border: "1px solid rgba(200,169,110,0.2)", borderRadius: "10px",
            padding: "11px 14px", color: "#e8dcc8", fontSize: "14px",
            fontFamily: "monospace", outline: "none", marginBottom: "14px",
          }}
        />
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onClose}
            style={{
              flex: 1, padding: "10px", borderRadius: "10px", cursor: "pointer",
              background: "transparent", border: "1px solid rgba(200,169,110,0.2)",
              color: "rgba(200,169,110,0.5)", fontFamily: "'Crimson Pro', serif", fontSize: "14px",
            }}>Cancel</button>
          <button onClick={() => onSave(val.trim())}
            style={{
              flex: 2, padding: "10px", borderRadius: "10px", cursor: "pointer",
              background: "linear-gradient(135deg, #c8a96e, #8b6914)",
              border: "none", color: "#0d0a05",
              fontFamily: "'Cinzel', serif", fontSize: "14px", letterSpacing: "0.05em",
            }}>Save Key</button>
        </div>
      </div>
    </div>
  );
}
