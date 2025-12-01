import React from "react";
import type { GreetingCard, CardAction } from "../types/greeting";

interface GreetingCardViewProps {
  card: GreetingCard;
  onAction?: (action: CardAction, card: GreetingCard) => void;
}

export const GreetingCardView: React.FC<GreetingCardViewProps> = ({ card, onAction }) => {
  const handleActionClick = (action: CardAction) => {
    if (onAction) {
      onAction(action, card);
    }
  };

  return (
    <div
      style={{
        borderRadius: 16,
        border: "1px solid rgba(0,0,0,0.08)",
        padding: 16,
        marginBottom: 12,
        display: "flex",
        gap: 12
      }}
    >
      {card.imageUrl && (
        <div style={{ width: 72, height: 72, overflow: "hidden", borderRadius: 12 }}>
          <img
            src={card.imageUrl}
            alt={card.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
          {card.type === "general_news" && "Allgemeine News"}
          {card.type === "personal_news" && "Deine News"}
          {card.type === "project" && "Projekt"}
          {card.type === "curate" && "Einstellungen"}
        </div>
        <div style={{ fontWeight: 600 }}>{card.title}</div>
        {card.subtitle && (
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{card.subtitle}</div>
        )}
        {card.body && <div style={{ fontSize: 13, marginTop: 6 }}>{card.body}</div>}
        {card.topicTags && card.topicTags.length > 0 && (
          <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {card.topicTags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 11,
                  padding: "2px 6px",
                  borderRadius: 999,
                  background: "rgba(0,0,0,0.04)"
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        {card.actions && card.actions.length > 0 && (
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {card.actions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => handleActionClick(action)}
                style={{
                  fontSize: 12,
                  borderRadius: 999,
                  border: "1px solid rgba(0,0,0,0.1)",
                  padding: "4px 10px",
                  background: "white",
                  cursor: "pointer"
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
