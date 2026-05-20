import React, { useEffect, useState } from "react";
import "./Toolbar.css";
import logoVideo from "../assets/lovo video.mp4";

const Toolbar = ({ onSelectChat, onNewChat, activeChatId }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [chats, setChats] = useState([]);

  /* ===== SIDEBAR STATE ===== */
  useEffect(() => {
    const saved = localStorage.getItem("toolbar-open");
    if (saved === "false") setIsOpen(false);
  }, []);

  useEffect(() => {
    localStorage.setItem("toolbar-open", isOpen);
  }, [isOpen]);

  /* ===== CTRL + B ===== */
  useEffect(() => {
    const handleKey = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === "b") {
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  /* ===== FETCH CHATS ===== */
  const fetchChats = async () => {
    try {
      let url = "http://localhost:5000/api/chat";

      if (search.trim()) {
        url = `http://localhost:5000/api/chat/search/${search}`;
      }

      const res = await fetch(url, {
        credentials: "include",
      });

      const data = await res.json();

      setChats(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching chats:", err);
    }
  };

  /* ✅ INITIAL LOAD */
  useEffect(() => {
    fetchChats();
  }, []);

  /* ✅ SEARCH WITH DEBOUNCE */
  useEffect(() => {
    const delay = setTimeout(() => {
      fetchChats();
    }, 300);

    return () => clearTimeout(delay);
  }, [search]);

  /* 🔥 AUTO UPDATE (NO RELOAD NEEDED) */
  useEffect(() => {
    const interval = setInterval(() => {
      fetchChats();
    }, 2000); // every 2 seconds

    return () => clearInterval(interval);
  }, [search]);

  /* 🔥 INSTANT UPDATE AFTER NEW CHAT */
  useEffect(() => {
    if (!activeChatId) return;
    fetchChats();
  }, [activeChatId]);

  /* ===== UI ===== */
  return (
    <div className={`sidebar ${isOpen ? "open" : "closed"}`}>
      
      {/* TOP */}
      <div className="top">
        <div className="toolbar-toggle" onClick={() => setIsOpen(!isOpen)}>
          ☰
        </div>
        {isOpen && <div className="logo"><video 
                                            src={logoVideo}
                                            autoPlay 
                                            loop 
                                            muted 
                                            playsInline
                                            className="logo-video"
                                          /></div>}
      </div>

      {/* SEARCH */}
      {isOpen && (
        <div className="search-box">
          <input
            type="text"
            placeholder="Search chats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* NEW CHAT */}
      <div className="new-chat" onClick={onNewChat}>
        ✏️ {isOpen && <span>New Chat</span>}
      </div>

      {/* CHAT LIST */}
      <div className="chat-list">
        {chats.length > 0 ? (
          chats.map((chat) => (
            <div
              key={chat._id}
              className={`chat-item ${
                activeChatId === chat._id ? "active" : ""
              }`}
              onClick={() => onSelectChat(chat)}
            >
              {isOpen ? (
                <>
                  <span className="chat-text">{chat.title}</span>
                  <span className="dots">⋮</span>
                </>
              ) : (
                <div className="chat-icon">
                  {chat.title?.charAt(0).toUpperCase()}{chat.title?.charAt(1)}...
                </div>
              )}
            </div>
          ))
        ) : (
          isOpen && <div className="no-results">No chats found</div>
        )}
      </div>

      {/* BOTTOM */}
      <div className="bottom">
        ⚙️ {isOpen && <span>Settings</span>}
      </div>
    </div>
  );
};

export default Toolbar;