import { useEffect, useState } from "react";
import "./Navbar.css";
import logo from "../assets/Logo.png";

function Navbar({ selectionMode, setSelectionMode, showChatActions, onCopyAll, onForward }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/user", {
          credentials: "include",
        });
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        setUser(data);
      } catch (err) {
        console.error("Failed to fetch user:", err);
        setUser(null);
      }
    };

    fetchUser();

    // Refetch user data when navbar comes into focus
    const handleFocus = () => fetchUser();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const handleLogout = async () => {
    try {
      const res = await fetch("http://localhost:5000/auth/logout", {
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
          style={{
            width: "30px",
            height: "auto",
            cursor: "pointer",
          }}
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