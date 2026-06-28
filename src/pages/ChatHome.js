import React, { useCallback, useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./ChatHome.css";
import { fetchJson } from "../utils/api";
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
  const [forwardPackage, setForwardPackage] = useState(null);
  const [forwardItems, setForwardItems] = useState([]);
  const [openedForwardedMessage, setOpenedForwardedMessage] = useState(null);
  const [backendWarning, setBackendWarning] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const backendWarningTimer = useRef(null);

  // IMAGE UPLOAD STATES & REFS
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageSize, setImageSize] = useState(120);

  const showBackendWarning = useCallback(() => {
    if (backendWarningTimer.current) clearTimeout(backendWarningTimer.current);
    setBackendWarning("Backend is not running. Please start the server and refresh.");
    backendWarningTimer.current = setTimeout(() => setBackendWarning(""), 4000);
  }, []);

  useEffect(() => {
    const apiBase = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
    fetchJson(`${apiBase}/api/user`, { credentials: "include" })
      .then((data) => {
        setIsAuthenticated(true);
        const displayName = data?.displayName || data?.email?.split("@")[0] || "User";
        document.title = displayName;
      })
      .catch((err) => {
        setIsAuthenticated(false);
        const errorMsg = String(err.message || "").toLowerCase();
        if (errorMsg.includes("backend not running") && !errorMsg.includes("unauthorized")) {
          showBackendWarning();
        }
        document.title = "Nowere";
      });
  }, [showBackendWarning]);

  const loadChat = useCallback(async (chatId) => {
    try {
      setChatId(chatId);
      const apiBase = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

      const data = await fetchJson(`${apiBase}/api/chat/${chatId}`, {
        credentials: "include",
      });

      if (data?.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      const errorMsg = String(err.message || "").toLowerCase();
      if (errorMsg.includes("backend not running") && !errorMsg.includes("unauthorized")) {
        showBackendWarning();
      }
      console.warn("Error loading chat:", err.message || err);
    }
  }, [showBackendWarning]);

  useEffect(() => {
    if (id) {
      loadChat(id);
    }
  }, [id, loadChat]);

  const togglePair = (index) => {
    const base = index % 2 === 0 ? index : index - 1;
    const pairId = base;

    setSelectedPairs((prev) =>
      prev.includes(pairId)
        ? prev.filter((id) => id !== pairId)
        : [...prev, pairId]
    );
  };

  const formatForwardMessage = (msg, label) => {
    const contentText = msg?.content?.trim() || "(image only)";
    let text = `${label}: ${contentText}`;

    if (msg?.image) {
      text += `\n\n![Forwarded image](${msg.image})`;
    }

    return text;
  };

  const handleForward = () => {
    if (selectedPairs.length === 0) {
      alert("Please select one or more messages to forward.");
      setForwardPackage(null);
      setForwardItems([]);
      return;
    }

    const sortedPairs = [...selectedPairs].sort((a, b) => a - b);

    const selectedText = sortedPairs
      .map((pairIndex) => {
        const userMsg = messages[pairIndex];
        const aiMsg = messages[pairIndex + 1];

        const parts = [];
        if (userMsg) parts.push(formatForwardMessage(userMsg, "You"));
        if (aiMsg) parts.push(formatForwardMessage(aiMsg, "Assistant"));

        return parts.join("\n\n");
      })
      .join("\n\n");

    const selectedItems = sortedPairs.flatMap((pairIndex) => {
      const userMsg = messages[pairIndex];
      const aiMsg = messages[pairIndex + 1];
      return [userMsg, aiMsg]
        .filter(Boolean)
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
          image: msg.image || null,
        }));
    });

    setForwardPackage(selectedText);
    setForwardItems(selectedItems);
  };

  useEffect(() => {
    if (selectedPairs.length === 0 && forwardPackage && forwardItems.length > 0) {
      setForwardPackage(null);
      setForwardItems([]);
    }
  }, [selectedPairs, forwardPackage, forwardItems]);

  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const onSelectChat = async (chat) => {
    loadChat(chat._id);
    navigate(`/chat/${chat._id}`);
  };

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

  const chatPairs = [];
  for (let i = 0; i < messages.length; i += 2) {
    chatPairs.push({
      pairId: i,
      pairMessages: messages.slice(i, i + 2),
    });
  }

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

        const parts = [];
        if (userMsg) parts.push(formatForwardMessage(userMsg, "You"));
        if (aiMsg) parts.push(formatForwardMessage(aiMsg, "Assistant"));

        return parts.join("\n\n");
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

  const handleCancel = () => {
    setSelectedPairs([]);
    setSelectionMode(false);
    setForwardPackage(null);
    setForwardItems([]);
  };

  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.start();

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognition.onerror = (event) => {
      console.error(event.error);
    };
  };

  const handleVoice = () => {
    alert("Voice input coming soon!");
  };

  const imageProcessing = () => {
    setShowMenu((prev) => !prev);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file.");
        return;
      }
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
    setShowMenu(false);
  };

  const removeSelectedImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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
    if ((!input.trim() && !selectedFile) || isLoading) return;

    setIsLoading(true);

    let imageBase64 = null;
    if (selectedFile) {
      try {
        imageBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(selectedFile);
          reader.onload = () => resolve(reader.result);
          reader.onerror = (error) => reject(error);
        });
      } catch (err) {
        console.error("Base64 conversion failed:", err);
      }
    }

    // Fallback message text if user uploads only an image with no text
    const textContent = input.trim() || "Analyze this image";

    const userMessage = { role: "user", content: textContent, image: imageBase64 };
    setMessages((prev) => [...prev, userMessage]);
    
    setInput("");
    removeSelectedImage();

    const startTime = Date.now();
    const apiBase = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

    try {
      const dbData = await fetchJson(`${apiBase}/api/chat/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: textContent,
          chatId: chatId,
          image: imageBase64,
        }),
      });

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
      console.error("Chat request failed:", err);
      setIsLoading(false);
      const errorMsg = String(err.message || "").toLowerCase();
      if (errorMsg.includes("backend not running") && !errorMsg.includes("unauthorized")) {
        showBackendWarning();
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: errorMsg.includes("unauthorized") || errorMsg.includes("login required")
            ? "Please log in to continue."
            : errorMsg.includes("backend not running")
            ? "Backend is not running. Please start the server and try again."
            : `Error: ${err.message || "Failed to connect to server. Please try again."}`,
        },
      ]);
    }
  };

  const markdownComponents = {
    p: ({ children }) => <span>{children}</span>,
    img: ({ alt, src }) => (
      <img
        src={src}
        alt={alt || "Forwarded image"}
        className="chat-message-image forwarded-chat-image"
        style={{
          width: "auto",
          maxWidth: "140px",
          maxHeight: "140px",
          height: "auto",
        }}
      />
    ),
    code({ inline, className, children }) {
      const language = className?.replace("language-", "").toUpperCase() || "CODE";

      if (inline) {
        return <code className="inline-code">{children}</code>;
      }

      return (
        <div className="code-block">
          <div className="code-header">
            <span>{language}</span>
            <button
              className="copy-btn"
              onClick={() => navigator.clipboard.writeText(String(children).trim())}
            >
              <img src={copyIcon} alt="Copy code" className="copy-icon" />
            </button>
          </div>
          <pre>
            <code>{children}</code>
          </pre>
        </div>
      );
    },
  };

  const parseForwarded = (text) => {
    if (!text) return { user: null, assistant: null };
    const youIndex = text.indexOf('You:');
    const assistantIndex = text.indexOf('Assistant:');
    if (youIndex !== -1 && assistantIndex !== -1 && assistantIndex > youIndex) {
      const user = text.substring(youIndex + 4, assistantIndex).trim();
      const assistant = text.substring(assistantIndex + 10).trim();
      return { user, assistant };
    }
    return { user: null, assistant: text };
  };

  const parseForwardedMessages = (text) => {
    if (!text) return [];

    const cleanedText = String(text)
      .replace(/^\s*📦\s*Forwarded Message\s*/i, "")
      .replace(/^\s*Forwarded Message\s*/i, "")
      .trim();

    const lines = cleanedText.split(/\r?\n/);
    const messages = [];
    let currentRole = null;
    let currentContent = [];

    const commit = () => {
      if (!currentRole || currentContent.length === 0) return;
      const content = currentContent.join("\n").trim();
      if (content) {
        messages.push({ role: currentRole, content });
      }
    };

    for (const line of lines) {
      const match = line.match(/^(You|Assistant)\s*:\s*(.*)$/i);
      if (match) {
        commit();
        currentRole = match[1].toLowerCase() === "you" ? "user" : "assistant";
        currentContent = [match[2] || ""];
      } else {
        currentContent.push(line);
      }
    }

    commit();

    if (messages.length === 0) {
      return [{ role: "assistant", content: cleanedText }];
    }
    return messages;
  };

  return (
    <>
      <Login />
      {backendWarning && (
        <div className="backend-warning-banner">{backendWarning}</div>
      )}
      <div className="app-layout">
        <Toolbar
          onSelectChat={async (chat) => {
            setForwardPackage(null);
            await onSelectChat(chat);
          }}
          onBackendStatus={(isOnline) => {
            if (!isOnline) showBackendWarning();
          }}
          onNewChat={() => {
            setForwardPackage(null);
            setMessages([]);
            setChatId(null);
            navigate('/');
          }}
          activeChatId={chatId}
          isAuthenticated={isAuthenticated}
        />
        <div className="main-content">
          <div className="topbar">
            <Navbar
              selectionMode={selectionMode}
              setSelectionMode={setSelectionMode}
              onBackendStatus={(isOnline) => {
                if (!isOnline) showBackendWarning();
              }}
              showChatActions={selectedPairs.length > 0}
              onCopyAll={copyAllMessages}
              onForward={() => {
                if (selectedPairs.length === 0) {
                  setForwardPackage(null);
                  return;
                }
                handleForward();
              }}
              onCancel={handleCancel}
            />
          </div>

          <div className={`chat-wrapper ${messages.length > 0 ? "chat-active" : "chat-empty"}`}>
            <div className="content-area" ref={scrollContainerRef} onScroll={handleScroll}>
              {openedForwardedMessage ? (
                (() => {
                  const { user, assistant } = parseForwarded(openedForwardedMessage);

                  return (
                    <div className="forwarded-message-display">
                      <button
                        className="close-forwarded-btn"
                        onClick={() => setOpenedForwardedMessage(null)}
                      >
                        ← Back
                      </button>

                      <div className="forwarded-message-content">
                        <h3 className="forwarded-display-title">📦 Forwarded Message</h3>

                        {user ? (
                          <div className="chat-pair">
                            <div className="message-row user">
                              <div className="bubble">
                                <ReactMarkdown components={markdownComponents}>
                                  {user}
                                </ReactMarkdown>
                              </div>
                            </div>

                            <div className="message-row assistant">
                              <div className="bubble">
                                <ReactMarkdown components={markdownComponents}>
                                  {assistant}
                                </ReactMarkdown>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="message-row assistant">
                            <div className="bubble">
                              <ReactMarkdown components={markdownComponents}>
                                {assistant}
                              </ReactMarkdown>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : messages.length === 0 && !isLoading ? (
                <h1 className="title">Ready when you are.</h1>
              ) : (
                <div className="chat-messages">
                  {chatPairs.map(({ pairId, pairMessages }) => {
                    const isSelected = selectedPairs.includes(pairId);

                    return (
                      <div
                        key={pairId}
                        className={`chat-pair ${isSelected ? "selected" : ""}`}
                      >
                        <input
                          type="checkbox"
                          className="pair-checkbox"
                          checked={isSelected}
                          onChange={() => togglePair(pairId)}
                        />

                        {pairMessages.map((msg, msgIndex) => (
                          <div
                            key={msg._id ?? msgIndex}
                            className={`message-row ${msg.role === "user" ? "user" : "assistant"}`}
                          >
                            <div className="bubble">
                              {msg.image && (
                                <div className="chat-message-image-container">
                                  <img src={msg.image} alt="Uploaded attachment" className="chat-message-image" />
                                </div>
                              )}
                              <ReactMarkdown components={markdownComponents}>
                                {msg.content}
                              </ReactMarkdown>
                            </div>
                          </div>
                        ))}
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
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: "none" }} 
                accept="image/*"
                onChange={handleFileChange}
              />

              <div className="input-box" style={{ position: "relative" }}>
                {imagePreview && (
                  <div className="image-preview-container">
                    <div className="preview-image-wrapper">
                      <img
                        src={imagePreview}
                        alt="Upload preview"
                        className="preview-thumbnail"
                        style={{ width: `${imageSize}px`, height: `${imageSize}px` }}
                      />
                      <button className="remove-preview-btn" onClick={removeSelectedImage} title="Remove image">
                        ✕
                      </button>
                    </div>
                    <div className="image-size-control">
                      <label htmlFor="image-size-slider">Size</label>
                      <input
                        id="image-size-slider"
                        type="range"
                        min="60"
                        max="240"
                        value={imageSize}
                        onChange={(e) => setImageSize(Number(e.target.value))}
                      />
                    </div>
                  </div>
                )}
                <button className="plus" onClick={imageProcessing}>+</button>

                {showMenu && (
                  <div className="popup-menu" ref={menuRef}>
                    <div className="menu-item" onClick={() => fileInputRef.current.click()}>
                      📎 Add photos & files
                    </div>
                    <div className="menu-item" onClick={() => alert("Create Image")}>
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
                  <img
                    src={mic}
                    alt="mic"
                    className="icon mic"
                    onClick={startListening}
                    style={{ cursor: "pointer" }}
                  />
                  <img
                    src={(input.trim() || selectedFile) ? Enter : voice}
                    alt="action"
                    className="icon voice"
                    onClick={(input.trim() || selectedFile) ? sendMessage : handleVoice}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
        <Messeges
          forwardPackage={forwardPackage}
          forwardItems={forwardItems}
          onForwardComplete={() => {
            setForwardPackage(null);
            setForwardItems([]);
          }}
          onPrepareForward={(text) => setForwardPackage(text)}
          onOpenForwarded={(text) => setOpenedForwardedMessage(text)}
          onOpenForwardedAsChat={async (text, senderName) => {
            try {
              const apiBase = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

              const newMessages = parseForwardedMessages(text);

              const payload = {
                title: `Forwarded by ${senderName || "Unknown"}`,
                messages: newMessages,
              };

              const created = await fetchJson(`${apiBase}/api/chat/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
              });

              if (created?._id) {
                setChatId(created._id);
                setMessages(created.messages || []);
                navigate(`/chat/${created._id}`);
              }
            } catch (err) {
              console.error("Open forwarded as chat failed:", err);
              alert("Unable to open forwarded message as a chat.");
            }
          }}
        />
      </div>
    </>
  );
}

export default ChatHome;