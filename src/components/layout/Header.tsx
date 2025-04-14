import { useState, useRef, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { SignOutButton } from "@clerk/clerk-react";
import { Notifications } from "../notifications";
import styles from "./Header.module.css";

interface HeaderProps {}

export const Header = ({}: HeaderProps) => {
  const { isLoaded, isSignedIn, user } = useUser();
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

  let displayUsername: string | null = null;
  if (isLoaded && isSignedIn && user) {
    displayUsername = user.username ||
                      (user.firstName && user.lastName ?
                        `${user.firstName} ${user.lastName}` :
                        user.emailAddresses?.[0]?.emailAddress || 'user');
  } else if (isLoaded && !isSignedIn) {
    displayUsername = "Guest";
  }

  return (
    <header className={styles.header}>
      <h1>Workoutmate</h1>
      <div className={styles.userProfile}>
        <div className={styles.userControls} style={{ gap: '0' }}>
          {/* Bell icon with adjusted margin to move it back a bit */}
          <span style={{
            fontSize: '24px',
            marginRight: '5px', /* Changed from -10px to 5px to move it back */
            zIndex: 5,
            display: 'inline-block',
            position: 'relative',
            top: '1px'
          }}>
            🔔
          </span>
          
          {/* Original notifications component - temporarily hidden
          {isLoaded && isSignedIn && <Notifications />}
          */}
          
          <div className={styles.profileContainer} onClick={toggleDropdown} style={{ zIndex: 10 }}>
            <div className={styles.profileIcon}>
              {displayUsername ? displayUsername.charAt(0).toUpperCase() : "U"}
            </div>
          </div>
        </div>
        {isDropdownOpen && (
          <div ref={dropdownRef} className={styles.profileDropdown}>
            <div className={styles.dropdownUserInfo}>{displayUsername}</div>
            {isSignedIn && (
              <SignOutButton>
                <button className={styles.dropdownItem}>
                  Sign Out
                </button>
              </SignOutButton>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
