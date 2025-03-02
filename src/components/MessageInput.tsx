import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

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
    <form onSubmit={handleSubmit}>
      <input
        value={newMessageText}
        onChange={(e) => setNewMessageText(e.target.value)}
        placeholder="Write a message…"
        autoFocus
      />
      <button type="submit" disabled={!newMessageText}>
        Send
      </button>
    </form>
  );
}; 