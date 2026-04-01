import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getFriends, getPendingRequests, searchUsers, sendFriendRequest, respondToFriendRequest, getAllUsers } from "@/lib/supabase-helpers";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, UserPlus, Check, X, MessageCircle, Bell, Users, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface Profile {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
}

interface FriendsListProps {
  onSelectFriend: (friendId: string, friendName: string) => void;
  selectedFriendId: string | null;
}

export default function FriendsList({ onSelectFriend, selectedFriendId }: FriendsListProps) {
  const { user } = useAuth();
  const [friends, setFriends] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [friendProfiles, setFriendProfiles] = useState<Record<string, Profile>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [existingFriendships, setExistingFriendships] = useState<Set<string>>(new Set());

  const loadData = async () => {
    const [f, p] = await Promise.all([getFriends(), getPendingRequests()]);
    setFriends(f);
    setPendingRequests(p);

    // Track existing friendships (accepted + pending)
    const friendshipUserIds = new Set<string>();
    f.forEach((fr: any) => {
      const otherId = fr.requester_id === user?.id ? fr.addressee_id : fr.requester_id;
      friendshipUserIds.add(otherId);
    });
    p.forEach((pr: any) => {
      friendshipUserIds.add(pr.requester_id);
    });
    // Also track outgoing pending requests
    if (user) {
      const { data: outgoing } = await supabase
        .from("friendships")
        .select("addressee_id")
        .eq("requester_id", user.id)
        .eq("status", "pending");
      outgoing?.forEach((o: any) => friendshipUserIds.add(o.addressee_id));
    }
    setExistingFriendships(friendshipUserIds);

    // Load profiles for friends
    const userIds = new Set<string>();
    f.forEach((fr: any) => {
      userIds.add(fr.requester_id);
      userIds.add(fr.addressee_id);
    });
    p.forEach((pr: any) => {
      userIds.add(pr.requester_id);
    });

    if (userIds.size > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", Array.from(userIds));
      
      const profileMap: Record<string, Profile> = {};
      profiles?.forEach((p: any) => {
        profileMap[p.user_id] = p;
      });
      setFriendProfiles(profileMap);
    }
  };

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  // Load all users when the add panel is opened
  useEffect(() => {
    if (showSearch && allUsers.length === 0) {
      setLoadingUsers(true);
      getAllUsers().then((users) => {
        setAllUsers(users as Profile[]);
        setLoadingUsers(false);
      });
    }
  }, [showSearch]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const results = await searchUsers(searchQuery);
    setSearchResults(results as Profile[]);
    setSearching(false);
  };

  const handleSendRequest = async (addresseeId: string) => {
    const { error } = await sendFriendRequest(addresseeId);
    if (error) {
      toast.error("Failed to send request");
    } else {
      toast.success("Friend request sent!");
      setExistingFriendships((prev) => new Set([...prev, addresseeId]));
      loadData();
    }
  };

  const handleRespond = async (id: string, status: "accepted" | "rejected") => {
    const { error } = await respondToFriendRequest(id, status);
    if (error) {
      toast.error("Failed to respond");
    } else {
      toast.success(status === "accepted" ? "Friend added!" : "Request rejected");
      loadData();
    }
  };

  const getFriendUserId = (friendship: any) => {
    return friendship.requester_id === user?.id ? friendship.addressee_id : friendship.requester_id;
  };

  const displayUsers = searchQuery.trim() ? searchResults : allUsers;

  return (
    <div className="h-full flex flex-col bg-card/50 backdrop-blur-sm">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground text-sm tracking-wide uppercase font-mono">Contacts</h2>
          <div className="flex gap-2">
            {pendingRequests.length > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-mono bg-quantum/15 text-quantum px-2 py-1 rounded-full border border-quantum/20">
                <Bell className="w-3 h-3" />
                {pendingRequests.length}
              </span>
            )}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`p-2 rounded-lg transition-all ${
                showSearch
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {showSearch ? <ChevronUp className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Add Friends Panel */}
        {showSearch && (
          <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
            <div className="flex gap-2">
              <Input
                placeholder="Search by username..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!e.target.value.trim()) setSearchResults([]);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="bg-secondary/50 border-border/50 text-sm placeholder:text-muted-foreground/50"
              />
              <Button size="sm" onClick={handleSearch} disabled={searching} className="bg-primary text-primary-foreground shrink-0">
                <Search className="w-4 h-4" />
              </Button>
            </div>

            {/* Users list */}
            <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg">
              {loadingUsers && (
                <div className="text-center py-4">
                  <Users className="w-5 h-5 text-muted-foreground animate-pulse mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground font-mono">SCANNING NETWORK...</p>
                </div>
              )}
              {!loadingUsers && displayUsers.length === 0 && searchQuery.trim() && (
                <p className="text-xs text-muted-foreground text-center py-3 font-mono">NO USERS FOUND</p>
              )}
              {!loadingUsers && !searchQuery.trim() && allUsers.length > 0 && (
                <p className="text-[10px] text-muted-foreground font-mono px-1 mb-1">ALL USERS ON NETWORK</p>
              )}
              {displayUsers.map((u) => {
                const alreadyFriend = existingFriendships.has(u.user_id);
                return (
                  <div key={u.id} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30 border border-border/30 hover:border-primary/20 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-mono font-bold text-primary border border-primary/20">
                        {u.username[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-mono text-foreground">@{u.username}</span>
                    </div>
                    {alreadyFriend ? (
                      <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-1 rounded">ADDED</span>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => handleSendRequest(u.user_id)} className="text-primary hover:text-primary hover:bg-primary/10 h-7 w-7 p-0">
                        <UserPlus className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="p-3 border-b border-border/50">
          <p className="text-[10px] font-mono text-quantum mb-2 tracking-wider">⚡ INCOMING REQUESTS</p>
          {pendingRequests.map((req) => (
            <div key={req.id} className="flex items-center justify-between p-2.5 rounded-lg bg-quantum/5 border border-quantum/15 mb-1.5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-quantum/15 flex items-center justify-center text-xs font-mono font-bold text-quantum">
                  {(friendProfiles[req.requester_id]?.username || "?")[0].toUpperCase()}
                </div>
                <span className="text-sm font-mono text-foreground">
                  @{friendProfiles[req.requester_id]?.username || "unknown"}
                </span>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => handleRespond(req.id, "accepted")} className="p-1.5 rounded-md bg-primary/15 text-primary hover:bg-primary/25 transition-colors border border-primary/20">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleRespond(req.id, "rejected")} className="p-1.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors border border-destructive/15">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Friends List */}
      <div className="flex-1 overflow-y-auto p-2">
        {friends.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <MessageCircle className="w-7 h-7 opacity-40" />
            </div>
            <p className="text-sm font-medium">No contacts yet</p>
            <p className="text-xs mt-1.5 font-mono text-muted-foreground/60">TAP + TO ADD FRIENDS</p>
          </div>
        ) : (
          friends.map((f) => {
            const friendUserId = getFriendUserId(f);
            const profile = friendProfiles[friendUserId];
            const isSelected = selectedFriendId === friendUserId;
            return (
              <button
                key={f.id}
                onClick={() => onSelectFriend(friendUserId, profile?.username || "unknown")}
                className={`w-full flex items-center gap-3 p-3 rounded-xl mb-1 transition-all duration-200 ${
                  isSelected
                    ? "bg-primary/10 border border-primary/25 shadow-[0_0_15px_hsl(var(--primary)/0.1)]"
                    : "hover:bg-secondary/50 border border-transparent hover:border-border/30"
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-mono text-sm font-bold transition-all ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-[0_0_10px_hsl(var(--primary)/0.3)]"
                    : "bg-secondary text-foreground"
                }`}>
                  {(profile?.username || "?")[0].toUpperCase()}
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isSelected ? "text-primary" : "text-foreground"}`}>
                    @{profile?.username || "unknown"}
                  </p>
                </div>
                {isSelected && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
