import React, { useState } from "react";
import { GreetingManagerPanel } from "./GreetingManagerPanel";
import type { GreetingCard, CardAction } from "../types/greeting";

interface ChatMessage {
  id: string;
  text: string;
}

export const ChatWithGreetingExample: React.FC = () => {
  const [showGreeting, setShowGreeting] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const handleGreetingAction = (action: CardAction, card: GreetingCard) => {
    const text =
      "Begrüßungsmanager Aktion: " +
      action.label +
      " für Karte " +
      card.title;
    const msg: ChatMessage = {
      id: "gm-" + String(Date.now()),
      text
    };
    setMessages((prev) => [msg, ...prev]);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <button
          type="button"
          onClick={() => setShowGreeting((v) => !v)}
          style={{
            padding: "6px 12px",
            borderRadius: 999,
            border: "1px solid rgba(0,0,0,0.2)",
            background: "white",
            cursor: "pointer"
          }}
        >
          Begrüßungsmanager
        </button>
      </div>
      <GreetingManagerPanel
        visible={showGreeting}
        onAction={handleGreetingAction}
      />
      <div>
        {messages.map((m) => (
          <div key={m.id} style={{ padding: "4px 0" }}>
            {m.text}
          </div>
        ))}
      </div>
    </div>
  );
};
