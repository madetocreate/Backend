import React, { useEffect, useState } from "react";
import type { GreetingCard, CardAction, GreetingFeedResponse } from "../types/greeting";
import { GreetingCardView } from "./GreetingCardView";

interface GreetingManagerPanelProps {
  visible: boolean;
  onAction?: (action: CardAction, card: GreetingCard) => void;
}

export const GreetingManagerPanel: React.FC<GreetingManagerPanelProps> = ({
  visible,
  onAction
}) => {
  const [cards, setCards] = useState<GreetingCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/greeting-feed");
        if (!res.ok) {
          throw new Error("HTTP " + res.status);
        }
        const data: GreetingFeedResponse = await res.json();
        if (!cancelled) {
          setCards(data.cards || []);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(String(err.message || err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  if (!visible) {
    return null;
  }

  if (loading && cards.length === 0) {
    return <div>Begrüßungsmanager lädt ...</div>;
  }

  if (error) {
    return <div>Begrüßungsmanager Fehler: {error}</div>;
  }

  if (cards.length === 0) {
    return <div>Heute gibt es keine besonderen Empfehlungen.</div>;
  }

  return (
    <div>
      {cards.map((card) => (
        <GreetingCardView
          key={card.id}
          card={card}
          onAction={(action) => {
            if (onAction) {
              onAction(action, card);
            }
          }}
        />
      ))}
    </div>
  );
};
