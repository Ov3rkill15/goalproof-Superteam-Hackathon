import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { Dashboard } from "./App";
import { Landing } from "./Landing";

// Minimal hash router — no dependency needed. "#/live" (or "#/app") shows the live
// board; anything else shows the marketing landing page.
function useHashRoute(): string {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => {
      setHash(window.location.hash);
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}

function Root() {
  const hash = useHashRoute();
  const onBoard = hash.startsWith("#/live") || hash.startsWith("#/app");
  return onBoard ? <Dashboard /> : <Landing />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
