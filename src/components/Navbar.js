import { useCallback, useEffect, useState } from "react";
import "./Navbar.css";
import logo from "../assets/Logo.png";
import { fetchJson } from "../utils/api";
import config from "../config/api.js";

function Navbar({ selectionMode, setSelectionMode, showChatActions, onCopyAll, onForward, onBackendStatus }) {
  const [user, setUser] = useState(null);

  const fetchUser = useCallback(async () => {
    try {
      const data = await fetchJson(`${config.API_BASE_URL}/api/user`, {
        credentials: "include",
      });
      onBackendStatus?.(true);
      setUser(data);
    } catch (err) {
      const errorMsg = String(err.message || "").toLowerCase();
      if (!errorMsg.includes("unauthorized") && !errorMsg.includes("login required")) {
        onBackendStatus?.(false);
      }
      if (!errorMsg.includes("unauthorized") && !errorMsg.includes("login required")) {
        console.warn("Failed to fetch user:", err.message || err);
      }
      setUser(null);
    }
  }, [onBackendStatus]);

  useEffect(() => {
    fetchUser();
    const handleFocus = () => fetchUser();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchUser]);

  const handleLogout = async () => {
    try {
      const res = await fetch(config.ENDPOINTS.AUTH.LOGOUT, {
        credentials: "include",
      });
      if (res.ok) {
        setUser(null);
        window.location.href = "/";
      }
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const getPhotoUrl = () => {
    if (user?.photo) return user.photo;
    const firstLetter = user?.email?.charAt(0) || "U";
    return `https://ui-avatars.com/api/?name=${firstLetter}&background=6b4a3a&color=fff&size=40`;
  };

  return (
    <div className="navbar">
      <div className="nav-left">
        <img
          src={logo}
          onClick={() => (window.location.href = "/")}
          className="logo"
          alt="Logo"
          style={{ width: "35%", height: "auto", cursor: "pointer" }}
        />
      </div>

      <div className="nav-actions">
        {showChatActions && (
          <>
            <button className="nav-action-btn" onClick={onCopyAll}>
              Copy all
            </button>
            <button className="nav-action-btn" onClick={onForward}>
              Forward
            </button>
          </>
        )}
      </div>

      <div className="nav-right">
        {user && (
          <div className="profile" tabIndex="0">
            <img
              src={getPhotoUrl()}
              alt="Profile"
              className="profile-pic"
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${user?.email?.charAt(0) || "U"}&background=6b4a3a&color=fff&size=40`;
              }}
            />
            <div className="dropdown">
              <p>{user?.email || "User"}</p>
              <button onClick={handleLogout}>Logout</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Navbar;