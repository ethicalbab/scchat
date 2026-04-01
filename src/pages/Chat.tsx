import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { signOut } from "@/lib/supabase-helpers";
import FriendsList from "@/components/FriendsList";
import ChatWindow from "@/components/ChatWindow";
import { Shield, LogOut, MessageCircle, Terminal } from "lucide-react";
import { toast } from "sonner";

const Chat = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [selectedFriend, setSelectedFriend] = useState<{ id: string; name: string } | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Shield className="w-10 h-10 text-primary animate-pulse mx-auto mb-3 drop-shadow-[0_0_10px_hsl(var(--primary)/0.4)]" />
          <p className="font-mono text-xs text-muted-foreground tracking-wider">INITIALIZING SECURE LINK...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate("/");
    return null;
  }

  const handleLogout = async () => {
    await signOut();
    toast.success("Disconnected securely");
    navigate("/");
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 shadow-[0_0_10px_hsl(var(--primary)/0.1)]">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-lg font-bold text-foreground">
            Se<span className="text-primary">Chat</span>
          </h1>
          <span className="text-[9px] font-mono text-muted-foreground/50 bg-secondary/50 px-2 py-0.5 rounded-full border border-border/30">v2.0</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-secondary/40 rounded-full px-3 py-1.5 border border-border/30">
            <Terminal className="w-3 h-3 text-primary" />
            <span className="text-xs font-mono text-foreground/80">
              {user.user_metadata?.username ? `@${user.user_metadata.username}` : user.email}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all border border-transparent hover:border-destructive/20"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 flex-shrink-0 border-r border-border/30">
          <FriendsList
            onSelectFriend={(id, name) => setSelectedFriend({ id, name })}
            selectedFriendId={selectedFriend?.id || null}
          />
        </div>

        {/* Chat area */}
        <div className="flex-1">
          {selectedFriend ? (
            <ChatWindow friendId={selectedFriend.id} friendName={selectedFriend.name} />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 rounded-3xl bg-muted/30 flex items-center justify-center mx-auto mb-5">
                  <MessageCircle className="w-10 h-10 text-muted-foreground/20" />
                </div>
                <p className="text-muted-foreground text-sm font-medium">Select a contact to start messaging</p>
                <p className="text-muted-foreground/40 text-[10px] font-mono mt-3 tracking-wider">ALL COMMUNICATIONS QUANTUM-SECURED</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
