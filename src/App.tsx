import React, { Component, lazy, Suspense } from "react";
import { Toaster } from "react-hot-toast";
import { useGameStore } from "./store/gameStore";
import { MenuScreen }   from "./components/MenuScreen";
import { TxFeed }       from "./components/TxFeed";
import { WalletButton } from "./components/WalletButton";

// Lazy-load heavy game screens so module errors don't kill the menu
const CharacterSelect = lazy(() => import("./components/CharacterSelect").then(m => ({ default: m.CharacterSelect })));
const GameCanvas      = lazy(() => import("./components/GameCanvas").then(m => ({ default: m.GameCanvas })));
const GameHUD         = lazy(() => import("./components/GameHUD").then(m => ({ default: m.GameHUD })));
const GameOver        = lazy(() => import("./components/GameOver").then(m => ({ default: m.GameOver })));
const Leaderboard     = lazy(() => import("./components/Leaderboard").then(m => ({ default: m.Leaderboard })));
const LobbyScreen     = lazy(() => import("./components/LobbyScreen").then(m => ({ default: m.LobbyScreen })));
const NFTGallery      = lazy(() => import("./components/NFTGallery").then(m => ({ default: m.NFTGallery })));

// Error boundary so crashes show a message instead of blank screen
class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: string | null }> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e.message }; }
  componentDidCatch(e: Error, info: React.ErrorInfo) { console.error("Screen error:", e, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: "2rem", color: "#ff0080", fontFamily: "monospace", background: "#0e0b1e", width: "100%", height: "100%" }}>
          <div style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>⚠ Render Error</div>
          <pre style={{ color: "#836EF9", fontSize: "0.75rem", whiteSpace: "pre-wrap" }}>{this.state.error}</pre>
          <button
            onClick={() => this.setState({ error: null })}
            style={{ marginTop: "1rem", padding: "0.5rem 1rem", background: "#836EF9", color: "#fff", border: "none", borderRadius: "0.5rem", cursor: "pointer", fontFamily: "monospace" }}
          >
            RESET
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const Loading = () => (
  <div style={{ width: "100%", height: "100%", background: "#0e0b1e", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <span style={{ fontFamily: "'Press Start 2P',monospace", color: "#836EF9", fontSize: "0.75rem" }}>LOADING...</span>
  </div>
);

export const App: React.FC = () => {
  const { currentScreen } = useGameStore();

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden", background: "#0e0b1e" }}>

      {/* === SCREEN ROUTER === */}
      <ErrorBoundary>
        {currentScreen === "menu" && <MenuScreen />}

        {currentScreen === "character_select" && (
          <div style={{ width: "100%", height: "100%", overflowY: "auto" }}>
            <Suspense fallback={<Loading />}><CharacterSelect /></Suspense>
          </div>
        )}

        {currentScreen === "game" && (
          <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <Suspense fallback={<Loading />}><GameCanvas /></Suspense>
            <Suspense fallback={null}><GameHUD /></Suspense>
          </div>
        )}

        {currentScreen === "game_over" && (
          <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(14,11,30,0.92)", display: "flex", alignItems: "center", justifyContent: "center", overflowY: "auto" }}>
              <Suspense fallback={<Loading />}><GameOver /></Suspense>
            </div>
          </div>
        )}

        {currentScreen === "leaderboard" && (
          <Suspense fallback={<Loading />}><Leaderboard /></Suspense>
        )}

        {currentScreen === "lobby" && (
          <div style={{ width: "100%", height: "100%", overflowY: "auto" }}>
            <Suspense fallback={<Loading />}><LobbyScreen /></Suspense>
          </div>
        )}

        {currentScreen === "nft_gallery" && (
          <div style={{ width: "100%", height: "100%", overflowY: "auto" }}>
            <Suspense fallback={<Loading />}><NFTGallery /></Suspense>
          </div>
        )}
      </ErrorBoundary>

      {/* === PERSISTENT GLOBAL UI === */}
      {(currentScreen === "menu" || currentScreen === "leaderboard" || currentScreen === "lobby" || currentScreen === "nft_gallery") && (
        <div style={{ position: "absolute", top: "1rem", right: "1rem", zIndex: 50 }}>
          <WalletButton />
        </div>
      )}

      <TxFeed />

      <Toaster
        position="bottom-left"
        toastOptions={{
          style: {
            background: "#1a1230", color: "#c4b5fd",
            border: "1px solid #836EF9",
            fontFamily: "'Rajdhani', sans-serif", fontSize: "14px", letterSpacing: "0.05em",
          },
          success: { iconTheme: { primary: "#39ff14", secondary: "#0e0b1e" } },
          error:   { iconTheme: { primary: "#ff0080", secondary: "#0e0b1e" } },
        }}
      />
    </div>
  );
};

