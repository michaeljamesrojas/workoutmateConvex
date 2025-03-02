import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import styles from "./Header.module.css";

interface HeaderProps {
  username: string | null;
}

export const Header = ({ username }: HeaderProps) => {
  const { logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className={styles.header}>
      <h1>Workoutmate</h1>
      <div className={styles.userProfile}>
        <div className={styles.profileContainer} onClick={toggleDropdown}>
          <div className={styles.profileIcon}>
            {username ? username.charAt(0).toUpperCase() : "U"}
          </div>
        </div>
        {isDropdownOpen && (
          <div ref={dropdownRef} className={styles.profileDropdown}>
            <div className={styles.dropdownUserInfo}>{username}</div>
            <button onClick={logout} className={styles.dropdownItem}>
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
