import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMessages, sendMessage, getProtocolColor } from "@/lib/supabase-helpers";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Shield, Lock, Zap, Gauge, Info, X, Eye, EyeOff } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface ChatWindowProps {
  friendId: string;
  friendName: string;
}

function EncryptionDetailsPanel({ msg, onClose }: { msg: any; onClose: () => void }) {
  const ed = msg.encryption_data;
  const protocol = msg.protocol || "Unknown";
  const color = getProtocolColor(protocol);
  const [showRawKey, setShowRawKey] = useState(false);

  const borderColor =
    color === "quantum" ? "border-quantum/30" : color === "hybrid" ? "border-hybrid/30" : "border-classical/30";
  const glowColor =
    color === "quantum" ? "shadow-[0_0_15px_hsl(var(--quantum)/0.1)]" : color === "hybrid" ? "shadow-[0_0_15px_hsl(var(--hybrid)/0.1)]" : "shadow-[0_0_15px_hsl(var(--classical)/0.1)]";
  const textColor =
    color === "quantum" ? "text-quantum" : color === "hybrid" ? "text-hybrid" : "text-classical";

  const maskValue = (val: string) => (showRawKey ? val : val.slice(0, 8) + "••••••••");

  return (
    <div className={`mt-2 rounded-xl border ${borderColor} bg-card/60 backdrop-blur-md p-3 ${glowColor} text-[10px] font-mono space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200`}>
      <div className="flex items-center justify-between">
        <span className={`font-semibold uppercase tracking-widest ${textColor}`}>
          🔐 Encryption Details
        </span>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setShowRawKey(!showRawKey)} className="text-muted-foreground hover:text-foreground transition-colors p-0.5">
            {showRawKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </button>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-0.5">
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        <div className="text-muted-foreground">Protocol</div>
        <div className={textColor}>{protocol}</div>

        {ed?.algorithm && (
          <>
            <div className="text-muted-foreground">Algorithm</div>
            <div className="text-foreground">{ed.algorithm}</div>
          </>
        )}

        {ed?.iv && (
          <>
            <div className="text-muted-foreground">IV (Nonce)</div>
            <div className="text-foreground break-all">{maskValue(ed.iv)}</div>
          </>
        )}

        {ed?.key && (
          <>
            <div className="text-muted-foreground">AES Key</div>
            <div className="text-foreground break-all">{maskValue(ed.key)}</div>
          </>
        )}

        {ed?.quantum_bits && (
          <>
            <div className="text-muted-foreground">Quantum Bits</div>
            <div className="text-foreground break-all">
              {showRawKey ? `[${ed.quantum_bits.join(",")}]` : `[${ed.quantum_bits.slice(0, 6).join(",")}...]`}
            </div>
          </>
        )}

        {ed?.qber !== undefined && (
          <>
            <div className="text-muted-foreground">QBER</div>
            <div className={`${(ed.qber > 0.11) ? "text-destructive" : textColor}`}>
              {(ed.qber * 100).toFixed(2)}%
              {ed.qber <= 0.11 ? " ✓ Secure" : " ⚠ High"}
            </div>
          </>
        )}

        {ed?.classical_key && (
          <>
            <div className="text-muted-foreground">Classical Key</div>
            <div className="text-foreground break-all">{maskValue(ed.classical_key)}</div>
          </>
        )}

        {ed?.full_hybrid !== undefined && (
          <>
            <div className="text-muted-foreground">Hybrid Mode</div>
            <div className={textColor}>
              {ed.full_hybrid ? "Full (K₁ ⊕ K₂)" : "Fallback (Classical)"}
            </div>
          </>
        )}

        <div className="text-muted-foreground">Threat Level</div>
        <div className="text-foreground">{((msg.threat_level || 0) * 100).toFixed(0)}%</div>
      </div>

      {/* Security rating bar */}
      <div className="pt-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-muted-foreground">Security Rating</span>
          <span className={textColor}>
            {protocol.includes("Quantum") ? "Maximum" : protocol.includes("Hybrid") ? "High" : "Standard"}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              color === "quantum" ? "bg-quantum" : color === "hybrid" ? "bg-hybrid" : "bg-classical"
            }`}
            style={{ width: protocol.includes("Quantum") ? "100%" : protocol.includes("Hybrid") ? "70%" : "35%" }}
          />
        </div>
      </div>
    </div>
  );
}

export default function ChatWindow({ friendId, friendName }: ChatWindowProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [threatLevel, setThreatLevel] = useState(0.1);
  const [expandedMsgId, setExpandedMsgId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const getActiveProtocol = () => {
    if (threatLevel >= 0.8) return "Quantum (BB84)";
    if (threatLevel >= 0.4) return "Hybrid (Kyber)";
    return "Classical (AES)";
  };

  const loadMessages = async () => {
    const msgs = await getMessages(friendId);
    setMessages(msgs);
  };

  useEffect(() => {
    loadMessages();

    const channel = supabase
      .channel(`messages-${friendId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (payload) => {
        const msg = payload.new as any;
        if (
          (msg.sender_id === user?.id && msg.receiver_id === friendId) ||
          (msg.sender_id === friendId && msg.receiver_id === user?.id)
        ) {
          if (msg.encryption_data) {
            try {
              const { data } = await supabase.functions.invoke("message-crypto", {
                body: { action: "decrypt", encryption_data: msg.encryption_data, ciphertext: msg.content },
              });
              if (data?.plaintext) {
                msg.content = data.plaintext;
              }
            } catch {
              msg.content = "[Decryption failed]";
            }
          }
          setMessages((prev) => [...prev, msg]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [friendId, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    const { error } = await sendMessage(friendId, newMessage.trim(), threatLevel);
    if (!error) {
      setNewMessage("");
    }
    setSending(false);
  };

  const getProtocolIcon = (protocol: string) => {
    if (protocol.includes("Quantum")) return <Zap className="w-3 h-3" />;
    if (protocol.includes("Hybrid")) return <Shield className="w-3 h-3" />;
    return <Lock className="w-3 h-3" />;
  };

  const getProtocolBadgeClasses = (protocol: string) => {
    const color = getProtocolColor(protocol);
    if (color === "quantum") return "bg-quantum/15 text-quantum border-quantum/25";
    if (color === "hybrid") return "bg-hybrid/15 text-hybrid border-hybrid/25";
    return "bg-classical/15 text-classical border-classical/25";
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border/50 flex items-center justify-between bg-card/30 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-mono text-sm font-bold text-primary border border-primary/20 shadow-[0_0_10px_hsl(var(--primary)/0.15)]">
            {friendName[0].toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-foreground">@{friendName}</p>
            <p className="text-[10px] font-mono text-muted-foreground tracking-wider">ENCRYPTED CHANNEL ACTIVE</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-full border ${getProtocolBadgeClasses(getActiveProtocol())}`}>
            {getProtocolIcon(getActiveProtocol())}
            {getActiveProtocol()}
          </span>
          <div className="flex items-center gap-2 text-[10px] font-mono text-primary">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_6px_hsl(var(--primary)/0.5)]" />
            LIVE
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 opacity-30" />
            </div>
            <p className="text-sm font-medium">Secure channel established</p>
            <p className="text-xs mt-1.5 font-mono text-muted-foreground/60">SEND A MESSAGE TO BEGIN TRANSMISSION</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === user?.id;
          const isExpanded = expandedMsgId === msg.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    isMe
                      ? "bg-primary/12 border border-primary/20 text-foreground rounded-br-md"
                      : "bg-secondary/60 border border-border/40 text-foreground rounded-bl-md"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
                <div className={`flex items-center gap-2 mt-1.5 px-1 ${isMe ? "justify-end" : "justify-start"}`}>
                  <button
                    onClick={() => setExpandedMsgId(isExpanded ? null : msg.id)}
                    className={`inline-flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full border cursor-pointer transition-all hover:scale-105 ${getProtocolBadgeClasses(msg.protocol)} ${isExpanded ? "ring-1 ring-offset-1 ring-offset-background ring-current" : ""}`}
                  >
                    {getProtocolIcon(msg.protocol)}
                    {msg.protocol}
                    <Info className="w-2.5 h-2.5 ml-0.5 opacity-60" />
                  </button>
                  <span className="text-[10px] text-muted-foreground/60 font-mono">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {isExpanded && msg.encryption_data && (
                  <EncryptionDetailsPanel msg={msg} onClose={() => setExpandedMsgId(null)} />
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Threat Level + Input */}
      <div className="border-t border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
              <Gauge className="w-3.5 h-3.5" />
              THREAT LEVEL
            </div>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${getProtocolBadgeClasses(getActiveProtocol())}`}>
              {getActiveProtocol()}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-classical">LOW</span>
            <div className="flex-1 relative">
              <Slider
                value={[threatLevel]}
                onValueChange={(v) => setThreatLevel(v[0])}
                min={0}
                max={1}
                step={0.1}
                className="w-full"
              />
            </div>
            <span className="text-[10px] font-mono text-quantum">MAX</span>
          </div>
        </div>

        <div className="px-4 pb-4 pt-1">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type a secure message..."
              className="bg-secondary/40 border-border/40 focus:border-primary/50 focus:ring-primary/10 placeholder:text-muted-foreground/40"
            />
            <Button
              onClick={handleSend}
              disabled={sending || !newMessage.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 shadow-[0_0_10px_hsl(var(--primary)/0.2)] hover:shadow-[0_0_15px_hsl(var(--primary)/0.3)] transition-shadow"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
