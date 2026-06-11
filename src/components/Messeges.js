import React, { useEffect, useRef, useState } from "react";
import "./Messeges.css";
import { io } from "socket.io-client";
import Enter from "../assets/Enter.png";

const apiBase = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
const socket = io(apiBase, {
  withCredentials: true,
});

const Messeges = () => {
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
        // Don't log 401/unauthorized errors - they're expected when not logged in
        if (!errorMsg.includes("unauthorized") && !errorMsg.includes("login required")) {
          console.warn("Failed to fetch user in Messages:", err.message || err);
        }
      });
  }, []);

  /* ===============================
     SOCKET
  =============================== */

  useEffect(() => {
    socket.on("receive-message", (msg) => {
      if (msg.conversationId === conversationId) {
        setMessages((prev) => [...prev, msg]);
      }

      loadInbox();
    });

    socket.on("online-users", (list) => {
      setOnlineUsers(list);
    });

    socket.on("typing", () => {
      setTyping("Typing...");
      setTimeout(() => setTyping(""), 1200);
    });

    return () => {
      socket.off("receive-message");
      socket.off("online-users");
      socket.off("typing");
    };
  }, [conversationId]);

  /* ===============================
     LOAD INBOX
  =============================== */

  const loadInbox = async () => {
    const res = await fetch(
      `${apiBase}/api/messages`,
      { credentials: "include" }
    );

    const data = await res.json();
    setInbox(data);
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

  /* ===============================
     OPEN CHAT
  =============================== */

  const openChat = async (u) => {
    setSelectedUser(u);

    const res = await fetch(
      `${apiBase}/api/messages/start`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          userId: u._id,
        }),
      }
    );

    const convo = await res.json();

    setConversationId(convo._id);

    const msgRes = await fetch(
      `${apiBase}/api/messages/${convo._id}`,
      { credentials: "include" }
    );

    const msgs = await msgRes.json();

    setMessages(msgs);
  };

  /* ===============================
     SEND
  =============================== */

  const sendMessage = async () => {
    if (!text.trim()) return;

    const payload = {
      conversationId,
      receiverId: selectedUser._id,
      text,
      senderId: user.id,
    };

    socket.emit("send-message", payload);

    setMessages((prev) => [
      ...prev,
      {
        text,
        sender: user.id,
      },
    ]);

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

    setText("");
    loadInbox();
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

      {/* SEARCH USERS */}
      {users.length > 0 && (
        <div className="messeges-list">
          {users.map((u) => (
            <div
              key={u._id}
              className="messeges-item"
              onClick={() => openChat(u)}
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
                <p>Start chat</p>
              </div>
            </div>
          ))}
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

            return (
              <div
                key={item._id}
                className="messeges-item"
                onClick={() => openChat(other)}
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
                    {item.lastMessage ||
                      "No messages"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CHAT BOX */}
      {isOpen && selectedUser && (
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
            {selectedUser.displayName}
          </div>

          <div className="chat-messages" ref={chatMessagesRef}>
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.sender === user.id ||
                  m.sender?._id === user.id
                    ? "me"
                    : "them"
                }
              >
                {m.text}
              </div>
            ))}
          </div>

          <div className="typing-text">
            {typing}
          </div>

          <div className="chat-send">
            <input
              value={text}
              onChange={(e) =>
                handleTyping(
                  e.target.value
                )
              }
              placeholder="Type message..."
            />

            <button onClick={sendMessage}>
              <img src={Enter} alt="Send" style={{height: "30px" }} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messeges;