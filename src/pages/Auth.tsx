import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signUp, signIn } from "@/lib/supabase-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Lock, Zap, Fingerprint } from "lucide-react";
import { toast } from "sonner";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success("Secure connection established");
        navigate("/chat");
      } else {
        if (!username.trim()) {
          toast.error("Username is required");
          setLoading(false);
          return;
        }
        const { error } = await signUp(email, password, username.trim());
        if (error) throw error;
        toast.success("Identity created. Welcome to SeChat.");
        navigate("/chat");
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Animated grid background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(hsl(var(--primary) / 0.04) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.04) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />
        {/* Radial glow */}
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at center, hsl(var(--primary) / 0.08) 0%, transparent 70%)'
        }} />
      </div>

      <div className="w-full max-w-md px-6 relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-5">
            <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 animate-pulse-glow shadow-[0_0_30px_hsl(var(--primary)/0.15)]">
              <Shield className="w-9 h-9 text-primary" />
            </div>
            <h1 className="text-5xl font-bold text-foreground tracking-tight">
              Se<span className="text-primary">Chat</span>
            </h1>
          </div>
          <p className="text-muted-foreground font-mono text-xs tracking-[0.2em]">
            QUANTUM-SECURED COMMUNICATIONS
          </p>
        </div>

        {/* Auth Card */}
        <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl p-8 shadow-[0_0_40px_hsl(var(--primary)/0.05)]">
          <div className="flex gap-1 mb-8 p-1 bg-secondary/50 rounded-xl">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                isLogin
                  ? "bg-primary text-primary-foreground shadow-[0_0_10px_hsl(var(--primary)/0.3)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Lock className="w-4 h-4 inline mr-2" />
              Sign In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                !isLogin
                  ? "bg-primary text-primary-foreground shadow-[0_0_10px_hsl(var(--primary)/0.3)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Fingerprint className="w-4 h-4 inline mr-2" />
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <label className="text-[10px] font-mono text-muted-foreground mb-2 block tracking-wider">USERNAME</label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose your handle"
                  className="bg-secondary/40 border-border/40 focus:border-primary/50 focus:ring-primary/10 h-11 placeholder:text-muted-foreground/40"
                  required={!isLogin}
                />
              </div>
            )}
            <div>
              <label className="text-[10px] font-mono text-muted-foreground mb-2 block tracking-wider">
                {isLogin ? "EMAIL OR USERNAME" : "EMAIL"}
              </label>
              <Input
                type={isLogin ? "text" : "email"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isLogin ? "agent@sechat.io or username" : "agent@sechat.io"}
                className="bg-secondary/40 border-border/40 focus:border-primary/50 focus:ring-primary/10 h-11 placeholder:text-muted-foreground/40"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-muted-foreground mb-2 block tracking-wider">PASSWORD</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-secondary/40 border-border/40 focus:border-primary/50 focus:ring-primary/10 h-11 placeholder:text-muted-foreground/40"
                required
                minLength={6}
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-12 text-sm shadow-[0_0_20px_hsl(var(--primary)/0.25)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.35)] transition-shadow"
            >
              {loading ? (
                <span className="font-mono text-xs tracking-wider">ESTABLISHING SECURE LINK...</span>
              ) : isLogin ? (
                <span className="font-mono text-xs tracking-wider">AUTHENTICATE →</span>
              ) : (
                <span className="font-mono text-xs tracking-wider">CREATE IDENTITY →</span>
              )}
            </Button>
          </form>
        </div>

        {/* Protocol badges */}
        <div className="flex justify-center gap-3 mt-8">
          {[
            { name: "AES-256", color: "classical" },
            { name: "BB84", color: "quantum" },
            { name: "KYBER", color: "hybrid" },
          ].map((proto) => (
            <span key={proto.name} className={`font-mono text-[10px] tracking-wider border rounded-full px-3 py-1.5 ${
              proto.color === "quantum"
                ? "text-quantum/70 border-quantum/20"
                : proto.color === "hybrid"
                ? "text-hybrid/70 border-hybrid/20"
                : "text-classical/70 border-classical/20"
            }`}>
              {proto.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Auth;
