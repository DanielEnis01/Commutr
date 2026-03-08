import { useEffect, useRef, useState } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import PermitLanding from "./components/Landing/PermitLanding";
import MapPane from "./components/Map/MapPane";
import SidePanel from "./components/Panel/SidePanel";
import MobileBottomBar from "./components/Panel/MobileBottomBar";
import { speakText, submitVoiceChat } from "./services/api";
import { ensureMicrophoneAccess, recordVoiceClip, releaseMicrophoneAccess } from "./services/voiceRecorder";

export default function App() {
  const [selectedPermit, setSelectedPermit] = useState(null);
  const [mode, setMode] = useState("manual");
  const [navigationRequest, setNavigationRequest] = useState(null);
  const [navigationState, setNavigationState] = useState({
    isNavigating: false,
    selectedLot: null,
  });
  const [voiceResult, setVoiceResult] = useState(null);
  const [voiceConversation, setVoiceConversation] = useState(null);
  const [voiceChatMessages, setVoiceChatMessages] = useState([]);
  const [devToolsOpen, setDevToolsOpen] = useState(false);
  const [voiceState, setVoiceState] = useState({
    busy: false,
    transcript: "",
    message: "Voice guidance is ready",
  });
  const [voicePlaybackActive, setVoicePlaybackActive] = useState(false);
  const audioRef = useRef(null);
  const lastSpokenInstructionRef = useRef("");
  const voiceConversationRef = useRef(null);
  const wakeRecognitionRef = useRef(null);
  const isWakeRecognitionStartingRef = useRef(false);
  const suppressWakeWordRef = useRef(false);
  const autoListenAfterAudioRef = useRef(false);
  const pendingNavigationStartRef = useRef(null);
  const voiceInteractionLockRef = useRef(false);
  const micPermissionPrimedRef = useRef(false);
  const modeRef = useRef(mode);
  const voiceBusyRef = useRef(voiceState.busy);
  const navigationStateRef = useRef(navigationState);
  const voicePlaybackActiveRef = useRef(false);

  useEffect(() => {
    voiceConversationRef.current = voiceConversation;
  }, [voiceConversation]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    voiceBusyRef.current = voiceState.busy;
  }, [voiceState.busy]);

  useEffect(() => {
    voicePlaybackActiveRef.current = voicePlaybackActive;
  }, [voicePlaybackActive]);

  useEffect(() => {
    navigationStateRef.current = navigationState;
  }, [navigationState]);

  const appendChatMessage = (role, text) => {
    if (!text) return;
    setVoiceChatMessages((current) => [
      ...current,
      {
        id: `${role}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        role,
        text,
      },
    ]);
  };

  const resetAppStateForPermitSelection = () => {
    setMode("manual");
    setNavigationRequest(null);
    setNavigationState({ isNavigating: false, selectedLot: null });
    setVoiceResult(null);
    setVoiceConversation(null);
    voiceConversationRef.current = null;
    setVoiceChatMessages([]);
    setVoiceState({
      busy: false,
      transcript: "",
      message: "Voice guidance is ready",
    });
    setDevToolsOpen(false);
    pendingNavigationStartRef.current = null;
    autoListenAfterAudioRef.current = false;
    lastSpokenInstructionRef.current = "";
    voiceInteractionLockRef.current = false;
    setVoicePlaybackActive(false);
    releaseMicrophoneAccess().catch(() => {});
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  const startVoicePrompt = async () => {
    const greeting = "Hey, how can I help you find the best parking to get to class today? Tell me what building you are going to.";
    voiceBusyRef.current = true;
    setVoiceState((current) => ({
      ...current,
      busy: true,
      transcript: "",
      message: "Starting voice guidance",
    }));
    appendChatMessage("assistant", greeting);

    try {
      const response = await speakText(greeting);
      voiceBusyRef.current = false;
      setVoiceState((current) => ({
        ...current,
        busy: false,
        message: greeting,
      }));
      playAudioPayload(response.audio_base64, response.mime_type, {
        autoListenAfterAudio: true,
      });
    } catch {
      voiceInteractionLockRef.current = false;
      voiceBusyRef.current = false;
      setVoiceState((current) => ({
        ...current,
        busy: false,
        message: greeting,
      }));
    }
  };

  const playAudioPayload = (audioBase64, mimeType = "audio/mpeg", options = {}) => {
    if (!audioBase64) {
      voiceInteractionLockRef.current = false;
      setVoicePlaybackActive(false);
      return;
    }
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current = null;
    }
    const audio = new Audio(`data:${mimeType};base64,${audioBase64}`);
    audioRef.current = audio;
    suppressWakeWordRef.current = true;
    autoListenAfterAudioRef.current = Boolean(options.autoListenAfterAudio);
    setVoicePlaybackActive(true);
    let finished = false;

    const finishAudio = () => {
      if (finished) return;
      finished = true;
      voicePlaybackActiveRef.current = false;
      setVoicePlaybackActive(false);
      voiceInteractionLockRef.current = false;
      suppressWakeWordRef.current = false;
      const pendingNavigation = pendingNavigationStartRef.current;
      pendingNavigationStartRef.current = null;
      if (pendingNavigation) {
        setNavigationRequest(pendingNavigation);
      }
      const shouldAutoListen = autoListenAfterAudioRef.current;
      autoListenAfterAudioRef.current = false;
      if (
        shouldAutoListen &&
        modeRef.current === "voice" &&
        !voiceBusyRef.current &&
        !navigationStateRef.current.isNavigating
      ) {
        window.setTimeout(() => {
          handleVoiceTrigger({ source: "handsfree" });
        }, 650);
      }
    };

    audio.onended = () => {
      finishAudio();
    };
    audio.onerror = () => {
      finishAudio();
    };
    audio.play().catch(() => {
      finishAudio();
    });
  };

  useEffect(() => {
    if (mode !== "voice") {
      autoListenAfterAudioRef.current = false;
      releaseMicrophoneAccess().catch(() => {});
    }
  }, [mode]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return undefined;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .slice(event.resultIndex)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .toLowerCase();

      if (suppressWakeWordRef.current) return;
      if (transcript.includes("hey commuter") && !voiceBusyRef.current && !voiceInteractionLockRef.current) {
        suppressWakeWordRef.current = true;
        setMode("voice");
        handleVoiceTrigger({ source: "wake-word" });
      }
    };

    recognition.onend = () => {
      isWakeRecognitionStartingRef.current = false;
      if (!wakeRecognitionRef.current) return;
      if (document.visibilityState !== "visible") return;
      if (suppressWakeWordRef.current) {
        window.setTimeout(() => wakeRecognitionRef.current?.start(), 1200);
      } else {
        window.setTimeout(() => wakeRecognitionRef.current?.start(), 250);
      }
    };

    recognition.onerror = () => {
      isWakeRecognitionStartingRef.current = false;
    };

    wakeRecognitionRef.current = recognition;

    if (!isWakeRecognitionStartingRef.current) {
      isWakeRecognitionStartingRef.current = true;
      recognition.start();
    }

    return () => {
      wakeRecognitionRef.current = null;
      recognition.onend = null;
      recognition.stop();
    };
  }, [voiceState.busy]);

  const handleVoiceTrigger = async ({ source = "manual" } = {}) => {
    try {
      if (
        voiceInteractionLockRef.current ||
        voiceBusyRef.current ||
        voicePlaybackActiveRef.current ||
        navigationStateRef.current.isNavigating
      ) {
        return;
      }
      voiceInteractionLockRef.current = true;
      if (source !== "manual" && mode !== "voice") setMode("voice");

      const currentConversation = voiceConversationRef.current;
      if (!currentConversation && source !== "handsfree") {
        if (!micPermissionPrimedRef.current) {
          await ensureMicrophoneAccess();
          micPermissionPrimedRef.current = true;
        }
        await startVoicePrompt();
        return;
      }
      const awaitingConfirmation = Boolean(currentConversation?.awaiting_confirmation);
      voiceBusyRef.current = true;
      setVoiceState((current) => ({
        ...current,
        busy: true,
        transcript: "",
        message: awaitingConfirmation
          ? "Listening for confirm or switch"
          : "Listening for your destination",
      }));

      const recording = await recordVoiceClip();
      const response = await submitVoiceChat(
        recording.audioBase64,
        recording.mimeType,
        currentConversation
          ? {
              awaiting_confirmation: currentConversation.awaiting_confirmation,
              pending_lot: currentConversation.pending_lot,
              destination_building: currentConversation.destination_building,
              destination_label: currentConversation.destination_label,
              defaulted_destination: currentConversation.defaulted_destination,
              ranked_lots: currentConversation.ranked_lots,
              summary: currentConversation.summary,
            }
          : null,
        selectedPermit
      );

      appendChatMessage("user", response.transcript || "...");
      setVoiceResult(response);
      const nextConversation = {
        awaiting_confirmation: response.awaiting_confirmation,
        pending_lot: response.pending_lot,
        destination_building: response.destination_building,
        destination_label: response.destination_label,
        defaulted_destination: response.defaulted_destination,
        ranked_lots: response.ranked_lots || [],
        summary: response.summary || {},
      };
      setVoiceConversation(nextConversation);
      voiceConversationRef.current = nextConversation;
      voiceBusyRef.current = false;
      setVoiceState({
        busy: false,
        transcript: response.transcript || "",
        message: response.tts_summary || "Voice guidance is ready",
      });
      appendChatMessage("assistant", response.tts_summary || "Voice guidance is ready");
      if (response.voice_action === "start_navigation" && response.selected_lot) {
        pendingNavigationStartRef.current = {
          lotId: response.selected_lot.toLowerCase(),
          autoStart: true,
          id: Date.now(),
        };
      }

      playAudioPayload(response.audio_base64, response.mime_type, {
        autoListenAfterAudio: response.awaiting_confirmation,
      });

      if (response.voice_action === "start_navigation" && response.selected_lot) {
        setVoiceConversation(null);
        voiceConversationRef.current = null;
        autoListenAfterAudioRef.current = false;
      } else if (response.voice_action === "cancelled") {
        setVoiceConversation(null);
        voiceConversationRef.current = null;
        pendingNavigationStartRef.current = null;
      }
    } catch (error) {
      voiceInteractionLockRef.current = false;
      voiceBusyRef.current = false;
      setVoicePlaybackActive(false);
      setVoiceState({
        busy: false,
        transcript: "",
        message: /microphone|permission|device/i.test(String(error?.message || ""))
          ? "Microphone access is blocked on this device"
          : "Voice guidance is unavailable",
      });
    }
  };

  const handleNavigationUpdate = ({ isNavigating, routeInfo, selectedLot }) => {
    setNavigationState({ isNavigating, selectedLot });
    if (mode !== "voice" || !isNavigating || !routeInfo?.instruction) return;
    if (routeInfo.instruction === lastSpokenInstructionRef.current) {
      return;
    }

    lastSpokenInstructionRef.current = routeInfo.instruction;
    appendChatMessage("assistant", routeInfo.instruction);
    speakText(routeInfo.instruction)
      .then((response) => playAudioPayload(response.audio_base64, response.mime_type))
      .catch(() => {});
  };

  if (!selectedPermit) {
    return <PermitLanding onSelectPermit={setSelectedPermit} />;
  }

  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_KEY}>
      <div className="app-layout">
        <div className="map-container">
          <MapPane
            navigationRequest={navigationRequest}
            onNavigationStarted={() => setNavigationRequest(null)}
            onNavigationUpdate={handleNavigationUpdate}
          />
        </div>
        <div className="sidebar-container">
            <SidePanel
            mode={mode}
            onModeChange={setMode}
            onNavigateToLot={(lotId) => setNavigationRequest({ lotId, autoStart: false, id: Date.now() })}
            voiceResult={voiceResult}
            voiceState={voiceState}
            voiceConversation={voiceConversation}
            voiceChatMessages={voiceChatMessages}
            isNavigating={navigationState.isNavigating}
            voicePlaybackActive={voicePlaybackActive}
            onVoiceTrigger={() => handleVoiceTrigger({ source: "manual" })}
            devToolsOpen={devToolsOpen}
            onToggleDevTools={() => setDevToolsOpen((current) => !current)}
            selectedPermit={selectedPermit}
            onChangePermit={() => {
              resetAppStateForPermitSelection();
              setSelectedPermit(null);
            }}
          />
        </div>
        <MobileBottomBar
          message={voiceState.message}
          voiceBusy={voiceState.busy || voicePlaybackActive}
          onMicClick={() => {
            setMode("voice");
            handleVoiceTrigger({ source: "mobile-mic" });
          }}
          chatMessages={voiceChatMessages}
          listening={voiceState.busy}
          isNavigating={navigationState.isNavigating}
        />
      </div>
    </APIProvider>
  );
}
