import { supabase } from "@/integrations/supabase/client";

/**
 * NEW: Local AI/Crypto Engine Helper
 * This directs traffic to your Deno server (index.ts) running on port 8888.
 */
async function callMessageCrypto(body: any) {
  const response = await fetch("http://127.0.0.1:8888", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`AI Engine Error: ${response.statusText}`);
  }

  return await response.json();
}

// --- AUTHENTICATION ---

export async function signUp(
  email: string,
  password: string,
  username: string
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: window.location.origin,
    },
  });
  return { data, error };
}

export async function signIn(identifier: string, password: string) {
  let email = identifier;
  if (!identifier.includes("@")) {
    const { data, error } = await supabase.rpc("get_email_by_username" as any, {
      p_username: identifier,
    });
    if (error || !data) {
      return { data: null, error: { message: "Username not found" } };
    }
    email = data as string;
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signOut() {
  return supabase.auth.signOut();
}

// --- PROFILE & USERS ---

export async function getCurrentProfile() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();
  return data;
}

export async function searchUsers(query: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .ilike("username", `%${query}%`)
    .neq("user_id", user.id)
    .limit(10);
  return data || [];
}

export async function getAllUsers() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .neq("user_id", user.id)
    .order("username")
    .limit(50);
  return data || [];
}

// --- SOCIAL / FRIENDSHIPS ---

export async function sendFriendRequest(addresseeId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const { error } = await supabase
    .from("friendships")
    .insert({ requester_id: user.id, addressee_id: addresseeId });
  return { error };
}

export async function respondToFriendRequest(
  friendshipId: string,
  status: "accepted" | "rejected"
) {
  const { error } = await supabase
    .from("friendships")
    .update({ status })
    .eq("id", friendshipId);
  return { error };
}

export async function getFriends() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("friendships")
    .select("*")
    .eq("status", "accepted")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
  return data || [];
}

export async function getPendingRequests() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("friendships")
    .select("*")
    .eq("addressee_id", user.id)
    .eq("status", "pending");
  return data || [];
}

// --- MESSAGING & ADAPTIVE CRYPTO ---

export async function getMessages(otherUserId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("messages")
    .select("*")
    .or(
      `and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`
    )
    .order("created_at", { ascending: true });

  if (!data || data.length === 0) return [];

  /**
   * INTEGRATION: Call the local Deno server for batch decryption.
   */
  try {
    const decryptResult = await callMessageCrypto({
      action: "decrypt",
      messages: data,
    });
    return decryptResult?.messages || data;
  } catch (err) {
    console.warn(
      "AI Decryption server unreachable, showing raw/cached data.",
      err
    );
    return data;
  }
}

export async function sendMessage(
  receiverId: string,
  content: string,
  threatLevel: number = 0.1
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  try {
    // We send a flat object to avoid any "undefined" errors in Deno
    const cryptoResult = await callMessageCrypto({
      action: "encrypt",
      message: content,
      threat_level: threatLevel,
    });

    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: receiverId,
      content: cryptoResult.ciphertext,
      protocol: cryptoResult.protocol,
      threat_level: threatLevel,
      encryption_data: cryptoResult.encryption_data,
    } as any);

    return { error, metrics: cryptoResult.metrics };
  } catch (err: any) {
    console.error("Send failed:", err);
    return { error: "Check if Deno terminal is running on port 8888" };
  }
}

// --- UTILS ---

export function getProtocolColor(protocol: string): string {
  const p = protocol.toLowerCase();
  if (p.includes("quantum")) return "quantum";
  if (p.includes("hybrid")) return "hybrid";
  return "classical";
}
