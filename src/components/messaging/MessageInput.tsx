import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import styles from "./MessageInput.module.css";

interface MessageInputProps {
  username: string;
  sessionId?: string; // Make sessionId optional for backward compatibility
  disabled?: boolean; // Add optional disabled prop
}

export const MessageInput = ({ username, sessionId, disabled = false }: MessageInputProps) => {
  const sendMessage = useMutation(api.chat.sendMessage);
  const [newMessageText, setNewMessageText] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    await sendMessage({
      user: username,
      body: newMessageText,
      sessionId,
    });
    setNewMessageText("");
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <input
        value={newMessageText}
        onChange={(e) => setNewMessageText(e.target.value)}
        placeholder={disabled ? "Log in to chat" : "Write a message…"}
        autoFocus
        className={styles.input}
        disabled={disabled} // Apply disabled prop
      />
      <button
        type="submit"
        disabled={!newMessageText || disabled} // Apply disabled prop here too
        className={styles.button}
      >
        Send
      </button>
    </form>
  );
};
