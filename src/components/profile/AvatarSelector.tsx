import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex';
import styles from './ProfileAvatar.module.css';

// List of avatar options - you can expand this with more options
const AVATAR_OPTIONS = [
  { id: 'default', type: 'letter', color: '#2c3e50' },  // Default letter avatar
  { id: 'avatar1', type: 'image', src: '👩‍💼' },
  { id: 'avatar2', type: 'image', src: '👨‍💼' },
  { id: 'avatar3', type: 'image', src: '👩‍🦰' },
  { id: 'avatar4', type: 'image', src: '👨‍🦱' },
  { id: 'avatar5', type: 'image', src: '👩‍🦳' },
  { id: 'avatar6', type: 'image', src: '👨‍🦳' },
  { id: 'avatar7', type: 'image', src: '👩‍🦲' },
  { id: 'avatar8', type: 'image', src: '👨‍🦲' },
  { id: 'avatar9', type: 'image', src: '🧑‍🏫' },
  { id: 'avatar10', type: 'image', src: '🧑‍⚕️' },
  { id: 'avatar11', type: 'image', src: '🧙‍♂️' },
  { id: 'avatar12', type: 'image', src: '🧙‍♀️' },
];

// Color options for letter avatars
const COLOR_OPTIONS = [
  '#2c3e50', // Dark blue (default)
  '#e74c3c', // Red
  '#3498db', // Blue
  '#2ecc71', // Green
  '#f39c12', // Orange
  '#9b59b6', // Purple
  '#1abc9c', // Teal
  '#34495e', // Dark gray
];

interface AvatarSelectorProps {
  userId: string;
  currentAvatar?: string;
  currentColor?: string;
  displayName: string;
  onClose: () => void;
  onAvatarChange: (newAvatar: string, newColor: string, imageUrl?: string) => void;
}

export function AvatarSelector({ 
  userId, 
  currentAvatar = 'default', 
  currentColor = '#2c3e50',
  displayName, 
  onClose,
  onAvatarChange
}: AvatarSelectorProps) {
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar);
  const [selectedColor, setSelectedColor] = useState(currentColor);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const updateUserAvatar = useMutation(api.users.updateUserAvatar);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const storeFileId = useMutation(api.files.storeFileId);
  const userFiles = useQuery(api.files.getUserProfileImage, { userId });
  
  // When component loads, check if user has a custom profile image
  useEffect(() => {
    if (userFiles && userFiles.url) {
      setUploadedImageUrl(userFiles.url);
      // If there's a custom image, set avatar to 'custom'
      if (currentAvatar === 'custom') {
        setSelectedAvatar('custom');
      }
    }
  }, [userFiles, currentAvatar]);
  
  // Handle avatar selection
  const handleAvatarSelect = (avatarId: string) => {
    setSelectedAvatar(avatarId);
  };
  
  // Handle color selection for letter avatars
  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
  };
  
  // Handle file selection for custom profile image
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setIsUploading(true);
      
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('File is too large. Maximum size is 2MB.');
        setIsUploading(false);
        return;
      }
      
      // Check file type
      if (!file.type.match('image.*')) {
        alert('Only image files are allowed.');
        setIsUploading(false);
        return;
      }
      
      console.log("Getting pre-signed URL for upload...");
      // Get pre-signed URL for upload
      const uploadUrl = await generateUploadUrl();
      console.log("Got URL:", uploadUrl);
      
      // Upload to Convex storage
      console.log("Uploading file:", file.name, file.type, file.size);
      const result = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      
      if (!result.ok) {
        console.error("Upload failed with status:", result.status, result.statusText);
        const errorText = await result.text().catch(() => "Unknown error");
        console.error("Error response:", errorText);
        throw new Error(`Upload failed: ${result.statusText}. Details: ${errorText}`);
      }
      
      // Get the storage ID from the response
      const responseJson = await result.json();
      console.log("Upload response:", responseJson);
      
      if (!responseJson.storageId) {
        throw new Error("No storage ID returned from upload");
      }
      
      console.log("Upload successful, saving storage ID:", responseJson.storageId);
      // Store the storage ID and update avatar settings in one go
      await updateUserAvatar({
        userId,
        avatarId: 'custom',
        avatarColor: selectedColor,
        storageId: responseJson.storageId
      });
      
      // Create a temporary URL for preview
      const imageUrl = URL.createObjectURL(file);
      setUploadedImageUrl(imageUrl);
      setSelectedAvatar('custom');
      
      setIsUploading(false);
    } catch (error) {
      console.error('Error uploading image:', error);
      setIsUploading(false);
      alert(`Failed to upload image: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };
  
  // Trigger file input click
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  // Save avatar selection
  const handleSave = async () => {
    try {
      console.log("Saving avatar...", { selectedAvatar, selectedColor, uploadedImageUrl });
      
      // Only update if not a custom avatar (custom avatars are handled in handleFileChange)
      if (selectedAvatar !== 'custom') {
        // Call parent's onAvatarChange to handle the database update
        onAvatarChange(selectedAvatar, selectedColor, uploadedImageUrl || undefined);
      }
      onClose();
    } catch (error) {
      console.error("Failed to update avatar:", error);
      alert('Failed to save avatar. Please try again.');
    }
  };

  return (
    <div className={styles.avatarSelectorOverlay} onClick={onClose}>
      <div className={styles.avatarSelectorModal} onClick={(e) => e.stopPropagation()}>
        <h3>Choose Your Avatar</h3>
        
        {/* Custom image upload option */}
        <div className={styles.uploadSection}>
          <div 
            className={`${styles.uploadAvatar} ${selectedAvatar === 'custom' ? styles.selected : ''}`}
            onClick={() => selectedAvatar === 'custom' ? handleUploadClick() : setSelectedAvatar('custom')}
          >
            {isUploading ? (
              <span>Uploading...</span>
            ) : uploadedImageUrl ? (
              <img 
                src={uploadedImageUrl} 
                alt="Custom avatar" 
                className={styles.customAvatarImg}
              />
            ) : (
              <div className={styles.uploadPlaceholder}>
                <span>📷</span>
                <span className={styles.uploadText}>Upload Photo</span>
              </div>
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            className={styles.fileInput}
            accept="image/*"
            onChange={handleFileChange}
          />
        </div>
        
        <div className={styles.avatarGrid}>
          {/* Default letter avatar option */}
          <div 
            className={`${styles.avatarOption} ${selectedAvatar === 'default' ? styles.selected : ''}`}
            onClick={() => handleAvatarSelect('default')}
            style={selectedAvatar === 'default' ? { backgroundColor: selectedColor } : undefined}
          >
            {displayName ? displayName.charAt(0).toUpperCase() : "U"}
          </div>
          
          {/* Emoji avatar options */}
          {AVATAR_OPTIONS.filter(avatar => avatar.id !== 'default').map(avatar => (
            <div 
              key={avatar.id}
              className={`${styles.avatarOption} ${selectedAvatar === avatar.id ? styles.selected : ''}`}
              onClick={() => handleAvatarSelect(avatar.id)}
            >
              <span className={styles.emojiAvatar}>{avatar.type === 'image' ? avatar.src : ''}</span>
            </div>
          ))}
        </div>
        
        {/* Show color options only when letter avatar is selected */}
        {selectedAvatar === 'default' && (
          <div className={styles.colorSection}>
            <h4>Choose Color</h4>
            <div className={styles.colorGrid}>
              {COLOR_OPTIONS.map(color => (
                <div 
                  key={color}
                  className={`${styles.colorOption} ${selectedColor === color ? styles.selectedColor : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorSelect(color)}
                />
              ))}
            </div>
          </div>
        )}
        
        <div className={styles.avatarButtons}>
          <button className={styles.cancelButton} onClick={onClose}>Cancel</button>
          <button className={styles.saveButton} onClick={handleSave} disabled={isUploading}>
            {isUploading ? 'Uploading...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
