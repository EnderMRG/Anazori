"use client";

import { Download, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function PwaInstallButton({ className = "landing-primary", label = "Install app" }: { className?: string; label?: string }) {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setInstalled(standalone);
    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
      setMessage("CivicSense is installed on your device.");
    };
    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function install() {
    setMessage("");
    if (installed) {
      setMessage("CivicSense is already installed.");
      return;
    }
    if (!promptEvent) {
      setMessage("Use your browser menu and choose ‘Install CivicSense’ or ‘Add to Home screen’.");
      return;
    }
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    setPromptEvent(null);
    if (choice.outcome === "accepted") setMessage("CivicSense is being installed.");
  }

  return <span className="pwa-install-control"><button type="button" className={className} onClick={install}><Smartphone size={16} /><span>{installed ? "App installed" : label}</span>{!installed && <Download size={14} />}</button>{message && <span className="pwa-install-message" role="status">{message}</span>}</span>;
}
