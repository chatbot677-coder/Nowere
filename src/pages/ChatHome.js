import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./ChatHome.css";
import mic from "../assets/mic.png";
import voice from "../assets/voice-icon.png";
import copyIcon from "../assets/copy-code-icon.png";
import Enter from "../assets/Enter.png";
import Navbar from "../components/Navbar";
import Login from "../components/Login";
import Toolbar from "../components/Toolbar";
import Messeges from "../components/Messeges";
import ReactMarkdown from "react-markdown";
import "../components/Toolbar.css";

function ChatHome() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [showArrow, setShowArrow] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [selectedPairs, setSelectedPairs] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);

  const [user, setUser] = useState(null);

 useEffect(() => {
  fetch("http://localhost:5000/api/user", {
    credentials: "include",
    })
      .then(res => {
        if (!res.ok) throw new Error("Not logged in");
        return res.json();
      })
      .then(data => {
        setUser(data);
        // Fallback chain: Display Name -> Email Prefix -> Default
        const name = data.displayName || data.email?.split("@")[0] || "User";
        document.title = name;
        console.log("User name loaded:", name); 
      })
      .catch((err) => {
        console.error(err);
        document.title = "My App";
      });
  }, []);

  useEffect(() => {
    if (id) {
      loadChat(id);
    }
  }, [id]);

  const togglePair = (index) => {
    const base = index % 2 === 0 ? index : index - 1;
    const pairId = base; // unique id for pair

    setSelectedPairs((prev) =>
      prev.includes(pairId)
        ? prev.filter((id) => id !== pairId)
        : [...prev, pairId]
    );
  };

  // ✅ NEW (popup menu)
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const loadChat = async (chatId) => {
    try {
      setChatId(chatId);

      const res = await fetch(`http://localhost:5000/api/chat/${chatId}`, {
        credentials: "include",
      });

      const data = await res.json();

      if (data?.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error("Error loading chat:", err);
    }
  };

  const onSelectChat = async (chat) => {
    loadChat(chat._id);
    navigate(`/chat/${chat._id}`);
  };

  // TIMER
  useEffect(() => {
    let interval;
    let start;

    if (isLoading) {
      start = Date.now();

      interval = setInterval(() => {
        const elapsed = (Date.now() - start) / 1000;
        setTimer(elapsed);
      }, 10);
    }

    return () => clearInterval(interval);
  }, [isLoading]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return mins > 0
      ? `${mins}m ${secs}.${ms.toString().padStart(3, "0")}s`
      : `${secs}.${ms.toString().padStart(3, "0")}s`;
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop <= clientHeight + 100;
    setShowArrow(!isAtBottom);
  };

  const getConversationText = () => {
    return messages
      .map((msg) => {
        const speaker = msg.role === "user" ? "You" : "Assistant";
        return `${speaker}: ${msg.content}`;
      })
      .join("\n\n");
  };

const copyAllMessages = async () => {
  if (selectedPairs.length === 0) {
    alert("Please select chat first.");
    return;
  }

  const selectedText = selectedPairs
    .sort((a, b) => a - b)
    .map((pairIndex) => {
      const userMsg = messages[pairIndex];
      const aiMsg = messages[pairIndex + 1];

      let text = "";

      if (userMsg) {
        text += `You: ${userMsg.content}\n`;
      }

      if (aiMsg) {
        text += `Assistant: ${aiMsg.content}`;
      }

      return text;
    })
    .join("\n\n");

  try {
    await navigator.clipboard.writeText(selectedText);
    alert("Selected chat copied to clipboard.");
  } catch (err) {
    console.error(err);
    alert("Unable to copy selected chat.");
  }
};

  const forwardChat = async () => {
    if (!messages.length) {
      alert("No chat selected to forward.");
      return;
    }

    const recipient = window.prompt("Enter recipient email or name to forward this chat:");
    if (!recipient) return;

    const allText = getConversationText();
    try {
      await navigator.clipboard.writeText(allText);
      alert(`Conversation copied. Paste it to forward to ${recipient}.`);
    } catch (err) {
      console.error(err);
      alert("Unable to copy conversation. Please try again.");
    }
  };

  const handleVoice = () => {
    alert("Voice input coming soon!");
  };

  // ✅ NEW (toggle menu)
  const imageProcessing = () => {
    setShowMenu((prev) => !prev);
  };

  // ✅ NEW (close on outside click)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setIsLoading(true);

    const startTime = Date.now();

    try {
      // Save message to DB and get the AI reply from the backend saved chat
      const dbResponse = await fetch("http://localhost:5000/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: currentInput,
          chatId: chatId,
        }),
      });

      if (!dbResponse.ok) {
        const errorData = await dbResponse.json().catch(() => null);
        throw new Error(errorData?.error || `DB save failed: ${dbResponse.status}`);
      }

      const dbData = await dbResponse.json();
      if (dbData.chatId) {
        setChatId(dbData.chatId);
        navigate(`/chat/${dbData.chatId}`);
      }

      const reply = dbData.reply || "No response generated.";
      const endTime = Date.now();
      const duration = formatTime((endTime - startTime) / 1000);

      setIsLoading(false);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: reply,
          isNew: true,
          timeTaken: duration,
        },
      ]);
    } catch (err) {
      console.error("Chat error:", err);
      setIsLoading(false);
      setMessages((prev) => [
        ...prev,
        { 
          role: "assistant", 
          content: `Error: ${err.message || "Failed to connect to server. Please try again."}` 
        },
      ]);
    }
  };

  return (
    <>
      
      <Login />
      <div className="app-layout">
        <Toolbar
          onSelectChat={onSelectChat}
          onNewChat={() => {
            setMessages([]);
            setChatId(null);
            navigate('/');
          }}
          activeChatId={chatId}
        />
        <div className="main-content">
          
          <div className="topbar">
            <Navbar
              selectionMode={selectionMode}
              setSelectionMode={setSelectionMode}
              showChatActions={selectedPairs.length > 0}
              onCopyAll={copyAllMessages}
              onForward={forwardChat}
            />
          </div>

          <div className={`chat-wrapper ${messages.length > 0 ? "chat-active" : "chat-empty"}`}>
            <div className="content-area" ref={scrollContainerRef} onScroll={handleScroll}>
              {messages.length === 0 && !isLoading ? (
                <h1 className="title">Ready when you are.</h1>
              ) : (
                <div className="chat-messages">
                  {messages.map((msg, index) => {
                    if (index % 2 !== 0) return null; // render only on pairs

                    const pairId = index;
                    const isSelected = selectedPairs.includes(pairId);

                    return (
                      <div
                        key={pairId}
                        className={`chat-pair ${isSelected ? "selected" : ""}`}
                      >
                        {/* Selection Checkbox */}
                        <input
                          type="checkbox"
                          className="pair-checkbox"
                          checked={isSelected}
                          onChange={() => togglePair(index)}
                        />

                        {/* USER MESSAGE */}
                        <div className="message-row user">
                          <div className="bubble">
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => <span>{children}</span>,

                                code({ inline, className, children }) {
                                  const language =
                                    className?.replace("language-", "").toUpperCase() || "CODE";

                                  if (inline) {
                                    return (
                                      <code className="inline-code">
                                        {children}
                                      </code>
                                    );
                                  }

                                  return (
                                    <div className="code-block">
                                      <div className="code-header">
                                        <span>{language}</span>

                                        <button
                                          className="copy-btn"
                                          onClick={() =>
                                            navigator.clipboard.writeText(
                                              String(children).trim()
                                            )
                                          }
                                        >
                                          📋
                                        </button>
                                      </div>

                                      <pre>
                                        <code>{children}</code>
                                      </pre>
                                    </div>
                                  );
                                },
                              }}
                            >
                              {messages[index]?.content}
                            </ReactMarkdown>
                          </div>
                        </div>

                        {/* AI MESSAGE */}
                        <div className="message-row assistant">
                          <div className="bubble">
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => <span>{children}</span>,

                                code({ inline, className, children }) {
                                  const language =
                                    className?.replace("language-", "").toUpperCase() || "CODE";

                                  if (inline) {
                                    return (
                                      <code className="inline-code">
                                        {children}
                                      </code>
                                    );
                                  }

                                  return (
                                    <div className="code-block">
                                      <div className="code-header">
                                        <span>{language}</span>

                                        <button
                                          className="copy-btn"
                                          onClick={() =>
                                            navigator.clipboard.writeText(
                                              String(children).trim()
                                            )
                                          }
                                        >
                                          <div className="copy-icon-wrapper">
                                            <img src={copyIcon} alt="copy" className="copy-icon"/>
                                          </div>
                                        </button>
                                      </div>

                                      <pre>
                                        <code>{children}</code>
                                      </pre>
                                    </div>
                                  );
                                },
                              }}
                            >
                              {messages[index + 1]?.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {isLoading && (
                    <div className="message-row assistant">
                      <div className="loading-timer">
                        ⏳ Generating response... {formatTime(timer)}
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {showArrow && (
              <div
                className="scroll-down-btn"
                onClick={() =>
                  messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
                }
              >
                ↓
              </div>
            )}

            <div className="input-container">
              <div className="input-box" style={{ position: "relative" }}>
                
                {/* PLUS BUTTON */}
                <button className="plus" onClick={imageProcessing}>+</button>

                {/* POPUP MENU */}
                {showMenu && (
                  <div className="popup-menu" ref={menuRef}>
                    <div className="menu-item" onClick={() => 
                      alert("Upload Image")}>
                      📎 Add photos & files
                    </div>
                    <div className="menu-item" onClick={() => 
                      alert("Create Image")}>
                      🖼️ Create image
                    </div>
                    <div className="menu-item more">⋯ More →</div>
                  </div>
                )}

                <input
                  type="text"
                  placeholder="Ask anything"
                  className="chat-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />

                <div className="icons">
                  <img src={mic} alt="mic" className="icon mic" />
                  <img
                    src={input.trim() ? Enter : voice}
                    alt="action"
                    className="icon voice"
                    onClick={input.trim() ? sendMessage : handleVoice}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
        <Messeges />
      </div>
    </>
  );
}

export default ChatHome;