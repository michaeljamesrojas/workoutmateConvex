import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

interface HeaderProps {
  username: string | null;
}

export const Header = ({ username }: HeaderProps) => {
  const { logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <header className="app-header">
      <h1>Workoutmate</h1>
      <div className="user-profile">
        <div className="profile-container" onClick={toggleDropdown}>
          <div className="profile-icon">
            {username ? username.charAt(0).toUpperCase() : "U"}
          </div>
        </div>
        {isDropdownOpen && (
          <div className="profile-dropdown">
            <div className="dropdown-user-info">
              {username}
            </div>
            <button onClick={logout} className="dropdown-item">
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}; 