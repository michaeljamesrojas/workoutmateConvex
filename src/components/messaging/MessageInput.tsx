import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import styles from "./MessageInput.module.css";

interface MessageInputProps {
  username: string;
}

export const MessageInput = ({ username }: MessageInputProps) => {
  const sendMessage = useMutation(api.chat.sendMessage);
  const [newMessageText, setNewMessageText] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage({ user: username, body: newMessageText });
    setNewMessageText("");
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <input
        value={newMessageText}
        onChange={(e) => setNewMessageText(e.target.value)}
        placeholder="Write a message…"
        autoFocus
        className={styles.input}
      />
      <button type="submit" disabled={!newMessageText} className={styles.button}>
        Send
      </button>
    </form>
  );
}; 