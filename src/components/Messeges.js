import React, { useEffect, useRef, useState } from "react";
import "./Messeges.css";
import { io } from "socket.io-client";
import Enter from "../assets/Enter.png";
import forwardIcon from "../assets/forword.png";

const apiBase = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
const socket = io(apiBase, {
  withCredentials: true,
});

const Messeges = ({ forwardPackage, onForwardComplete, onPrepareForward, onOpenForwarded, onOpenForwardedAsChat }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);

  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);

  const [selectedUser, setSelectedUser] = useState(null);
  const [conversationId, setConversationId] = useState(null);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState("");
  const [forwardRecipients, setForwardRecipients] = useState([]);
  const [forwardNote, setForwardNote] = useState("");
  
  // ✅ FIX 1: Added loading state to prevent UI freezing when opening chats
  const [isLoadingChat, setIsLoadingChat] = useState(false); 

  const isForwardMode = Boolean(forwardPackage);

  /* ===============================
     DRAG STATES
  =============================== */

  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [chatHeight, setChatHeight] = useState(420);

  const draggingSidebar = useRef(false);
  const draggingChat = useRef(false);
  const chatMessagesRef = useRef(null);

  /* ===============================
     AUTO SCROLL TO LATEST MESSAGE
  =============================== */

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages]);

  /* ===============================
     SAVE OPEN/CLOSE
  =============================== */

  useEffect(() => {
    const saved = localStorage.getItem("messeges-open");
    if (saved === "true") setIsOpen(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("messeges-open", isOpen);
  }, [isOpen]);

  /* ===============================
     DRAG LOGIC
  =============================== */

  useEffect(() => {
    const move = (e) => {
      if (draggingSidebar.current) {
        const newWidth = window.innerWidth - e.clientX;

        if (newWidth >= 70 && newWidth <= 600) {
          setSidebarWidth(newWidth);
        }
      }

      if (draggingChat.current) {
        const newHeight = window.innerHeight - e.clientY;

        if (newHeight >= 250 && newHeight <= 800) {
          setChatHeight(newHeight);
        }
      }
    };

    const stop = () => {
      draggingSidebar.current = false;
      draggingChat.current = false;
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", stop);

    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", stop);
    };
  }, []);

  /* ===============================
     CURRENT USER
  =============================== */

  useEffect(() => {
    fetch(`${apiBase}/api/user`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.id) {
          setUser(data);
          socket.emit("join", data.id);
        }
      })
      .catch((err) => {
        const errorMsg = String(err.message || "").toLowerCase();
        if (!errorMsg.includes("unauthorized") && !errorMsg.includes("login required")) {
          console.warn("Failed to fetch user in Messages:", err.message || err);
        }
      });
  }, []);

  /* ===============================
     SOCKET
  =============================== */

  // ✅ FIX 2: Added `user` to dependencies and ignored echoing self-sent messages
  useEffect(() => {
    const handleReceive = (msg) => {
  if (user && (msg.senderId === user.id || msg.sender?._id === user.id)) return; 

  const incomingConversationId = String(msg.conversationId || "");
  const currentConversationId = String(conversationId || "");

  if (incomingConversationId === currentConversationId) {
    setMessages((prev) => [...prev, msg]);
  } else {
    // Update local state instead of fetching from the database
    setInbox(prev => {
      const updated = prev.map(chat => {
        if (chat._id === incomingConversationId) {
          return { ...chat, lastMessage: msg.text || "New Image", updatedAt: new Date() };
        }
        return chat;
      });
      // Move updated chat to the top
      return updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    });
  }
};

    socket.on("receive-message", handleReceive);

    socket.on("online-users", (list) => {
      setOnlineUsers(list);
    });

    socket.on("typing", () => {
      setTyping("Typing...");
      setTimeout(() => setTyping(""), 1200);
    });

    return () => {
      socket.off("receive-message", handleReceive);
      socket.off("online-users");
      socket.off("typing");
    };
  }, [conversationId, user]);

  /* ===============================
     LOAD INBOX
  =============================== */

  const loadInbox = async () => {
    try {
      const res = await fetch(
        `${apiBase}/api/messages`,
        { credentials: "include" }
      );
      const data = await res.json();
      setInbox(data);
    } catch (err) {
      console.error("Failed to load inbox", err);
    }
  };

  useEffect(() => {
    if (user) loadInbox();
  }, [user]);

  /* ===============================
     SEARCH USERS
  =============================== */

  useEffect(() => {
    if (!search.trim()) {
      setUsers([]);
      return;
    }

    const timer = setTimeout(async () => {
      const res = await fetch(
        `${apiBase}/api/messages/search?q=${search}`,
        { credentials: "include" }
      );

      const data = await res.json();
      setUsers(data);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (forwardPackage) {
      setIsOpen(true);
      setSelectedUser(null);
      setConversationId(null);
      setMessages([]);
      setForwardRecipients([]);
      setForwardNote("");
    }
  }, [forwardPackage]);

  const toggleRecipient = (u) => {
    if (!isForwardMode) {
      openChat(u);
      return;
    }

    setForwardRecipients((prev) =>
      prev.includes(u._id)
        ? prev.filter((id) => id !== u._id)
        : [...prev, u._id]
    );
  };

  const sendForwardedPackage = async () => {
    if (!forwardPackage || forwardRecipients.length === 0 || !user) return;

    try {
      for (const recipientId of forwardRecipients) {
        const res = await fetch(
          `${apiBase}/api/messages/start`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ userId: recipientId }),
          }
        );
        const convo = await res.json();

        const forwardedText = `${forwardNote ? forwardNote.trim() + "\n\n" : ""}Forwarded Message\n\n${forwardPackage}`;
        
        const payload = {
          conversationId: convo._id,
          receiverId: recipientId,
          text: forwardedText,
          senderId: user.id,
          sender: {
            _id: user.id,
            displayName: user.displayName,
            photo: user.photo,
          },
        };

        await fetch(
          `${apiBase}/api/messages/send`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
          }
        );

        socket.emit("send-message", {
          ...payload,
          conversationId: String(convo._id),
        });

        if (String(conversationId) === String(convo._id)) {
          setMessages((prev) => [...prev, payload]);
        }
      }

      setForwardRecipients([]);
      onForwardComplete?.();
      loadInbox();
      alert("Forwarded message package to selected users.");
    } catch (err) {
      console.error("Failed to forward message package:", err);
      alert("Unable to send forwarded message. Please try again.");
    }
  };

  /* ===============================
     OPEN CHAT
  =============================== */

  // ✅ FIX 3: Implemented loading states so the UI doesn't freeze waiting for two API calls
  const openChat = async (u) => {
    setSelectedUser(u);
    setIsLoadingChat(true); 
    setMessages([]); 

    try {
      // Hit our new unified backend route
      const res = await fetch(`${apiBase}/api/messages/open`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: u._id }),
      });

      const data = await res.json();

      // Set both pieces of state instantly from one response object
      if (data.conversation && data.messages) {
        setConversationId(data.conversation._id);
        setMessages(data.messages);
      }
    } catch (error) {
      console.error("Failed to open chat", error);
    } finally {
      setIsLoadingChat(false); 
    }
  };

  /* ===============================
     SEND
  =============================== */

  // ✅ FIX 4: Removed loadInbox() to prevent heavy fetching on every keypress/enter
  const sendMessage = async () => {
    if (!text.trim()) return;

    const payload = {
      conversationId,
      receiverId: selectedUser._id,
      text,
      senderId: user.id,
      sender: {
        _id: user.id,
        displayName: user.displayName,
        photo: user.photo,
      },
    };

    // Update UI locally instantly
    setMessages((prev) => [...prev, payload]);
    setText("");

    // Emit socket event
    socket.emit("send-message", payload);

    // Save in background
    try {
      await fetch(
        `${apiBase}/api/messages/send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );
    } catch (error) {
      console.error("Failed to save message", error);
    }
  };

  /* ===============================
     TYPING
  =============================== */

  const handleTyping = (value) => {
    setText(value);

    if (!selectedUser) return;

    socket.emit("typing", {
      receiverId: selectedUser._id,
      senderId: user.id,
    });
  };

  /* ===============================
     UI
  =============================== */

  const renderForwardedContent = (text) => {
    if (!text) return null;
    const lines = String(text).split(/\r?\n/);
    return lines.map((line, idx) => {
      const imgMatch = line.match(/!\[[^\]]*\]\(([^)]+)\)/);
      if (imgMatch) {
        const url = imgMatch[1];
        return (
          <img
            key={idx}
            src={url}
            alt="forwarded"
            style={{
              maxWidth: 40,
              maxHeight: 40,
              width: 40,
              height: 40,
              objectFit: "cover",
              borderRadius: 6,
              display: "inline-block",
              marginRight: 6,
            }}
          />
        );
      }

      return (
        <div key={idx} style={{ whiteSpace: "pre-wrap", marginBottom: 4 }}>
          {line}
        </div>
      );
    });
  };

  return (
    <div
      className={`messeges ${isOpen ? "open" : "closed"}`}
      style={{ width: isOpen ? sidebarWidth : 70 }}
    >
      {/* Sidebar Drag */}
      {isOpen && (
        <div
          className="sidebar-resizer"
          onMouseDown={() =>
            (draggingSidebar.current = true)
          }
        />
      )}

      {/* TOP */}
      <div className="messeges-top">
        <div
          className="messeges-toggle"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? "➤" : "💬"}
        </div>

        {isOpen && <span>Messages</span>}
      </div>

      {/* SEARCH */}
      {isOpen && (
        <div className="messeges-search">
          <input
            placeholder="Search users..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />
        </div>
      )}

      {isOpen && isForwardMode && (
        <div className="forward-preview">
          <div className="forward-header">
            <span>Forward package preview</span>
            <span>{forwardRecipients.length} user{forwardRecipients.length === 1 ? "" : "s"} selected</span>
          </div>
          <div className="forward-note">
            <textarea
              placeholder="Add a note or simple text to forward with the message..."
              value={forwardNote}
              onChange={(e) => setForwardNote(e.target.value)}
              rows={3}
            />
          </div>
          <div className="forward-preview-content">
            {renderForwardedContent(forwardPackage)}
          </div>
        </div>
      )}

      {isOpen && isForwardMode && (
        <div className="forward-action-bar">
          {forwardRecipients.length > 0 && (
            <button
              className="forward-send"
              onClick={sendForwardedPackage}
            >
              <img src={Enter} alt="Send" />
            </button>
          )}
          <button
            className="forward-cancel"
            type="button"
            onClick={() => onForwardComplete?.()}
          >
            Cancel
          </button>
        </div>
      )}

      {/* SEARCH USERS */}
      {users.length > 0 && (
        <div className="messeges-list">
          {users.map((u) => {
            const selected = forwardRecipients.includes(u._id);

            return (
              <div
                key={u._id}
                className={`messeges-item ${isForwardMode ? "forward-mode" : ""} ${selected ? "forward-selected" : ""}`}
                onClick={() => toggleRecipient(u)}
              >
                <img
                  src={u.photo}
                  alt=""
                  className="avatar"
                />

                <div className="text">
                  <span>
                    {u.displayName}
                    {onlineUsers.includes(u._id)
                      ? " 🟢"
                      : " ⚫"}
                  </span>
                  <p>{isForwardMode ? "Select to forward" : "Start chat"}</p>
                </div>

                {isForwardMode && (
                  <button className="open-only-btn" type="button" disabled>
                    Select
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* INBOX */}
      {users.length === 0 && (
        <div className="messeges-list">
          {inbox.map((item) => {
            const other = item.members.find(
              (m) => m._id !== user?.id
            );

            if (!other) return null;

            const selected = forwardRecipients.includes(other._id);

            return (
              <div
                key={item._id}
                className={`messeges-item ${isForwardMode ? "forward-mode" : ""} ${selected ? "forward-selected" : ""}`}
                onClick={() => toggleRecipient(other)}
              >
                <img
                  src={other.photo}
                  alt=""
                  className="avatar"
                />

                <div className="text">
                  <span>
                    {other.displayName}
                    {onlineUsers.includes(
                      other._id
                    )
                      ? " 🟢"
                      : " ⚫"}
                  </span>

                  <p>
                    {isForwardMode ? "Select to forward" : item.lastMessage || "No messages"}
                  </p>
                </div>

                {isForwardMode && (
                  <button className="open-only-btn" type="button">
                    Select
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CHAT BOX */}
      {isOpen && !isForwardMode && selectedUser && (
        <div
          className="chat-box"
          style={{ height: chatHeight }}
        >
          {/* Vertical Drag */}
          <div
            className="chat-resizer"
            onMouseDown={() =>
              (draggingChat.current = true)
            }
          />

          <div className="chat-head">
            <div className="chat-head-user">
              <img src={selectedUser.photo} alt={selectedUser.displayName || 'User'} className="chat-head-avatar" />
              <span>{selectedUser.displayName}</span>
            </div>
            <button
              className="chat-close"
              onClick={() => {
                setSelectedUser(null);
                setConversationId(null);
                setMessages([]);
              }}
              aria-label="Close chat"
            >
              ×
            </button>
          </div>

          <div className="chat-messages" ref={chatMessagesRef}>
            {isLoadingChat ? (
              <div className="chat-spinner-container">
                <div className="chat-spinner"></div>
              </div>
            ) : (
              messages.map((m, i) => {
                const messageText = m.text ?? m.content ?? "";
                const isFromMe = m.sender === user.id || m.sender?._id === user.id;
                const isForwarded = messageText.includes("Forwarded Message");

                if (!isForwarded) {
                  return (
                    <div
                      key={i}
                      className={isFromMe ? "me" : "them"}
                    >
                      {messageText}
                    </div>
                  );
                }

                return (
                  <div
                    key={i}
                    className={isFromMe ? "message-container me-container" : "message-container them-container"}
                  >
                    <div className="message-box forwarded-message-box">
                      <div className={`message-label ${isFromMe ? "me-label" : "them-label"}`}>
                        📦 Forwarded Message
                      </div>
                      <div className="message-content">
                        {renderForwardedContent(messageText)}
                      </div>
                      <div className="message-actions">
                        <button
                          type="button"
                          className="message-btn open"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const senderName =
                              m.sender?.displayName ||
                              m.sender?.name ||
                              (typeof m.sender === "string"
                                ? m.sender === user?.id
                                  ? user?.displayName
                                  : selectedUser?.displayName
                                : selectedUser?.displayName) ||
                              "Unknown";

                            if (onOpenForwardedAsChat) {
                              onOpenForwardedAsChat(messageText, senderName);
                            }
                          }}
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          className="message-btn forward"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            if (onPrepareForward) {
                              onPrepareForward(messageText);
                            } else {
                              alert("Forward function not available.");
                            }
                          }}
                          title="Forward this message"
                        >
                          <img src={forwardIcon} alt="Forward" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="typing-text">
            {typing}
          </div>

          <div className="chat-send">
            <input
              value={text}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type message..."
            />

            <button onClick={sendMessage}>
              <img src={Enter} alt="Send" style={{ height: "30px" }} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messeges;