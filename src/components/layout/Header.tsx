import { useState, useRef, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { SignOutButton } from "@clerk/clerk-react";
import { Notifications } from "../notifications";
import { AvatarSelector } from "../profile/AvatarSelector";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex";
import styles from "./Header.module.css";

interface HeaderProps {}

export const Header = ({}: HeaderProps) => {
  const { isLoaded, isSignedIn, user } = useUser();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAvatarSelectorOpen, setIsAvatarSelectorOpen] = useState(false);
  const [avatarId, setAvatarId] = useState('default');
  const [avatarColor, setAvatarColor] = useState('#2c3e50');
  const [profileImageUrl, setProfileImageUrl] = useState<string | undefined>(undefined);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Fetch user data from Convex if signed in
  const userId = isLoaded && isSignedIn && user ? user.id : null;
  const userData = useQuery(api.users.getUser, userId ? { userId } : "skip");
  const userProfileImage = useQuery(api.files.getUserProfileImage, userId ? { userId } : "skip");
  const updateUserAvatar = useMutation(api.users.updateUserAvatar);

  // Update avatar state when user data loads
  useEffect(() => {
    if (userData) {
      setAvatarId(userData.avatarId || 'default');
      setAvatarColor(userData.avatarColor || '#2c3e50');
    }
  }, [userData]);
  
  // Update profile image URL when available
  useEffect(() => {
    if (userProfileImage && userProfileImage.url) {
      setProfileImageUrl(userProfileImage.url);
    }
  }, [userProfileImage]);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };
  
  const openAvatarSelector = () => {
    setIsAvatarSelectorOpen(true);
    setIsDropdownOpen(false); // Close dropdown when opening avatar selector
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
  
  // Handle avatar change
  const handleAvatarChange = async (newAvatarId: string, newColor: string, newImageUrl?: string) => {
    try {
      console.log("Handling avatar change in Header:", { newAvatarId, newColor, newImageUrl });

      // Update avatar in database
      if (userId) {
        const result = await updateUserAvatar({
          userId,
          avatarId: newAvatarId,
          avatarColor: newColor,
          storageId: newAvatarId === 'custom' ? newImageUrl : null // Only set storageId for custom avatars
        });
        console.log("Database update result:", result);

        // Update local state
        setAvatarId(newAvatarId);
        setAvatarColor(newColor);
        setProfileImageUrl(newAvatarId === 'custom' ? newImageUrl : undefined);

        // Close the avatar selector
        setIsAvatarSelectorOpen(false);
      } else {
        throw new Error("No user ID available");
      }
    } catch (error) {
      console.error("Failed to update avatar in Header:", error);
      alert('Failed to save avatar changes. Please try again.');
    }
  };
  
  // Render avatar based on selected option
  const renderAvatar = () => {
    if (avatarId === 'custom' && profileImageUrl) {
      // Custom uploaded image
      return (
        <div className={styles.profileIcon} style={{ padding: 0, overflow: 'hidden' }}>
          <img 
            src={profileImageUrl} 
            alt="Profile" 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover' 
            }} 
          />
        </div>
      );
    } else if (avatarId === 'default') {
      // Letter avatar with selected color
      return (
        <div 
          className={styles.profileIcon} 
          style={{ backgroundColor: avatarColor }}
        >
          {displayUsername ? displayUsername.charAt(0).toUpperCase() : "U"}
        </div>
      );
    } else {
      // Get avatar emoji from ID (the number part of the ID)
      const avatarNum = parseInt(avatarId.replace('avatar', ''));
      const emojiOptions = ['👩‍💼', '👨‍💼', '👩‍🦰', '👨‍🦱', '👩‍🦳', '👨‍🦳', '👩‍🦲', '👨‍🦲', '🧑‍🏫', '🧑‍⚕️', '🧙‍♂️', '🧙‍♀️'];
      const emoji = avatarNum <= emojiOptions.length ? emojiOptions[avatarNum - 1] : '👤';
      
      return (
        <div className={styles.profileIcon} style={{ fontSize: '1.8rem' }}>
          {emoji}
        </div>
      );
    }
  };

  return (
    <header className={styles.header}>
      <h1>Workoutmate</h1>
      <div className={styles.userProfile}>
        <div className={styles.userControls} style={{ gap: '0' }}>
          {/* Bell icon with adjusted margin to move it back a bit */}
          <span style={{
            fontSize: '24px',
            marginRight: '5px',
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
          
          <div 
            className={styles.profileContainer} 
            onClick={toggleDropdown} 
            style={{ zIndex: 10 }}
          >
            {renderAvatar()}
          </div>
        </div>
        {isDropdownOpen && (
          <div ref={dropdownRef} className={styles.profileDropdown}>
            <div className={styles.dropdownUserInfo}>{displayUsername}</div>
            
            {/* Add change avatar option */}
            {isSignedIn && (
              <button 
                className={styles.dropdownItem}
                onClick={openAvatarSelector}
              >
                Change Avatar
              </button>
            )}
            
            {isSignedIn && (
              <SignOutButton>
                <button className={styles.dropdownItem}>
                  Sign Out
                </button>
              </SignOutButton>
            )}
          </div>
        )}
        
        {/* Avatar selector modal */}
        {isAvatarSelectorOpen && isSignedIn && userId && (
          <AvatarSelector
            userId={userId}
            currentAvatar={avatarId}
            currentColor={avatarColor}
            displayName={displayUsername || ''}
            onClose={() => setIsAvatarSelectorOpen(false)}
            onAvatarChange={handleAvatarChange}
          />
        )}
      </div>
    </header>
  );
};
