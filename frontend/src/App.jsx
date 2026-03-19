import { useEffect, useRef, useState } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import PermitLanding from "./components/Landing/PermitLanding";
import MapPane from "./components/Map/MapPane";
import SidePanel from "./components/Panel/SidePanel";
import MobileBottomBar from "./components/Panel/MobileBottomBar";
import { speakText, submitVoiceChat } from "./services/api";
import { ensureMicrophoneAccess, recordVoiceClip, releaseMicrophoneAccess } from "./services/voiceRecorder";

function getPermissionStateLabel(status, fallback = "prompt") {
  if (status === "granted" || status === "denied" || status === "prompt") {
    return status;
  }
  return fallback;
}

export default function App() {
  const [selectedPermit, setSelectedPermit] = useState(null);
  const [mode, setMode] = useState("manual");
  const [locationPermission, setLocationPermission] = useState("prompt");
  const [locationGateComplete, setLocationGateComplete] = useState(false);
  const [voicePermission, setVoicePermission] = useState("prompt");
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
  const autoListenTimeoutRef = useRef(null);
  const autoListenPendingRef = useRef(false);
  const lastSpokenInstructionRef = useRef("");
  const voiceConversationRef = useRef(null);
  const voiceSessionStartedRef = useRef(false);
  const autoListenAfterAudioRef = useRef(false);
  const pendingNavigationStartRef = useRef(null);
  const voiceInteractionLockRef = useRef(false);
  const modeRef = useRef(mode);
  const voiceBusyRef = useRef(voiceState.busy);
  const navigationStateRef = useRef(navigationState);
  const voicePlaybackActiveRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let locationPermissionStatus = null;
    let microphonePermissionStatus = null;

    async function syncPermissions() {
      if (!navigator.permissions?.query) {
        if (!cancelled) {
          setLocationPermission(navigator.geolocation ? "prompt" : "unsupported");
          setVoicePermission(navigator.mediaDevices?.getUserMedia ? "prompt" : "unsupported");
        }
        return;
      }

      try {
        if (navigator.geolocation) {
          locationPermissionStatus = await navigator.permissions.query({ name: "geolocation" });
          if (!cancelled) {
            const nextState = getPermissionStateLabel(locationPermissionStatus.state);
            setLocationPermission(nextState);
            if (nextState === "granted") {
              setLocationGateComplete(true);
            }
          }
          locationPermissionStatus.onchange = () => {
            setLocationPermission(getPermissionStateLabel(locationPermissionStatus.state));
            if (locationPermissionStatus.state === "granted") {
              setLocationGateComplete(true);
            }
          };
        } else if (!cancelled) {
          setLocationPermission("unsupported");
        }
      } catch {
        if (!cancelled) {
          setLocationPermission(navigator.geolocation ? "prompt" : "unsupported");
        }
      }

      try {
        if (navigator.mediaDevices?.getUserMedia) {
          microphonePermissionStatus = await navigator.permissions.query({ name: "microphone" });
          if (!cancelled) {
            setVoicePermission(getPermissionStateLabel(microphonePermissionStatus.state));
          }
          microphonePermissionStatus.onchange = () => {
            setVoicePermission(getPermissionStateLabel(microphonePermissionStatus.state));
          };
        } else if (!cancelled) {
          setVoicePermission("unsupported");
        }
      } catch {
        if (!cancelled) {
          setVoicePermission(navigator.mediaDevices?.getUserMedia ? "prompt" : "unsupported");
        }
      }
    }

    syncPermissions();

    return () => {
      cancelled = true;
      if (locationPermissionStatus) {
        locationPermissionStatus.onchange = null;
      }
      if (microphonePermissionStatus) {
        microphonePermissionStatus.onchange = null;
      }
    };
  }, []);

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
    voiceSessionStartedRef.current = false;
    setVoiceChatMessages([]);
    setVoiceState({
      busy: false,
      transcript: "",
      message: "Voice guidance is ready",
    });
    setDevToolsOpen(false);
    pendingNavigationStartRef.current = null;
    autoListenAfterAudioRef.current = false;
    autoListenPendingRef.current = false;
    lastSpokenInstructionRef.current = "";
    voiceInteractionLockRef.current = false;
    setVoicePlaybackActive(false);
    if (autoListenTimeoutRef.current) {
      window.clearTimeout(autoListenTimeoutRef.current);
      autoListenTimeoutRef.current = null;
    }
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
    voiceSessionStartedRef.current = true;
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
        fallbackText: response.text || greeting,
      });
    } catch {
      setVoiceState((current) => ({
        ...current,
        busy: false,
        message: greeting,
      }));
      playAudioPayload(null, null, {
        autoListenAfterAudio: true,
        fallbackText: greeting,
      });
    }
  };

  const scheduleAutoListen = () => {
    if (
      modeRef.current !== "voice" ||
      voiceBusyRef.current ||
      navigationStateRef.current.isNavigating
    ) {
      voiceInteractionLockRef.current = false;
      autoListenPendingRef.current = false;
      return;
    }

    autoListenPendingRef.current = true;
    const autoListenDelayMs = /iPad|iPhone|iPod/.test(navigator.userAgent) ? 1300 : 650;
    autoListenTimeoutRef.current = window.setTimeout(() => {
      autoListenTimeoutRef.current = null;
      autoListenPendingRef.current = false;
      handleVoiceTrigger({ source: "handsfree" });
    }, autoListenDelayMs);
  };

  const finishVoicePlayback = () => {
    voicePlaybackActiveRef.current = false;
    setVoicePlaybackActive(false);
    voiceInteractionLockRef.current = false;
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
      scheduleAutoListen();
    }
  };

  const playAudioPayload = (audioBase64, mimeType = "audio/mpeg", options = {}) => {
    if (!audioBase64) {
      setVoicePlaybackActive(false);
      const shouldAutoListen = Boolean(options.autoListenAfterAudio);
      autoListenAfterAudioRef.current = false;
      if (shouldAutoListen) {
        scheduleAutoListen();
      } else {
        voiceInteractionLockRef.current = false;
      }
      return;
    }
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (autoListenTimeoutRef.current) {
      window.clearTimeout(autoListenTimeoutRef.current);
      autoListenTimeoutRef.current = null;
    }
    autoListenPendingRef.current = false;
    const audio = new Audio(`data:${mimeType};base64,${audioBase64}`);
    audioRef.current = audio;
    autoListenAfterAudioRef.current = Boolean(options.autoListenAfterAudio);
    setVoicePlaybackActive(true);
    let finished = false;

    const finishAudio = () => {
      if (finished) return;
      finished = true;
      finishVoicePlayback();
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
      if (autoListenTimeoutRef.current) {
        window.clearTimeout(autoListenTimeoutRef.current);
        autoListenTimeoutRef.current = null;
      }
      autoListenPendingRef.current = false;
      releaseMicrophoneAccess().catch(() => {});
    }
  }, [mode]);

  useEffect(() => () => {
    if (autoListenTimeoutRef.current) {
      window.clearTimeout(autoListenTimeoutRef.current);
    }
    autoListenPendingRef.current = false;
  }, []);

  const requestLocationPermission = async () => {
    if (!navigator.geolocation) {
      setLocationPermission("unsupported");
      setLocationGateComplete(true);
      return false;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => {
          setLocationPermission("granted");
          setLocationGateComplete(true);
          resolve(true);
        },
        () => {
          setLocationPermission("denied");
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    });
  };

  const requestVoicePermission = async () => {
    try {
      await ensureMicrophoneAccess();
      setVoicePermission("granted");
      return true;
    } catch {
      setVoicePermission("denied");
      return false;
    }
  };

  const handleVoiceTrigger = async ({ source = "manual" } = {}) => {
    try {
      if (autoListenTimeoutRef.current) {
        window.clearTimeout(autoListenTimeoutRef.current);
        autoListenTimeoutRef.current = null;
      }
      if (
        voiceInteractionLockRef.current ||
        voiceBusyRef.current ||
        autoListenPendingRef.current ||
        voicePlaybackActiveRef.current ||
        navigationStateRef.current.isNavigating
      ) {
        return;
      }
      voiceInteractionLockRef.current = true;
      if (source !== "manual" && mode !== "voice") setMode("voice");
      if (voicePermission !== "granted") {
        const granted = await requestVoicePermission();
        if (!granted) {
          voiceInteractionLockRef.current = false;
          setVoiceState((current) => ({
            ...current,
            busy: false,
            message: "Microphone access is required to use voice guidance",
          }));
          return;
        }
      }

      const currentConversation = voiceConversationRef.current;
      if (!currentConversation && source !== "handsfree" && !voiceSessionStartedRef.current) {
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
        fallbackText: response.tts_summary || "Voice guidance is ready",
      });

      if (response.voice_action === "start_navigation" && response.selected_lot) {
        setVoiceConversation(null);
        voiceConversationRef.current = null;
        autoListenAfterAudioRef.current = false;
      } else if (response.voice_action === "cancelled") {
        setVoiceConversation(null);
        voiceConversationRef.current = null;
        voiceSessionStartedRef.current = false;
        pendingNavigationStartRef.current = null;
      }
    } catch (error) {
      const errorMessage = String(error?.message || error || "Unknown error");
      console.error("[Commutr] Voice trigger failed", error);
      voiceInteractionLockRef.current = false;
      autoListenPendingRef.current = false;
      voiceBusyRef.current = false;
      setVoicePlaybackActive(false);
      setVoiceState({
        busy: false,
        transcript: "",
        message: /microphone|permission|device/i.test(errorMessage)
          ? "Microphone access is blocked on this device"
          : `Voice failed: ${errorMessage}`,
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
      .then((response) => playAudioPayload(response.audio_base64, response.mime_type, {
        fallbackText: response.text || routeInfo.instruction,
      }))
      .catch(() => {});
  };

  if (!selectedPermit) {
    return (
      <PermitLanding
        onSelectPermit={setSelectedPermit}
        locationPermission={locationPermission}
        locationGateComplete={locationGateComplete}
        onRequestLocationAccess={requestLocationPermission}
        onSkipLocationAccess={() => setLocationGateComplete(true)}
      />
    );
  }

  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_KEY}>
      <div className="app-layout">
        <div className="map-container">
          <MapPane
            locationEnabled={locationPermission === "granted"}
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
            voiceAutoPending={autoListenPendingRef.current}
            onVoiceTrigger={() => handleVoiceTrigger({ source: "manual" })}
            devToolsOpen={devToolsOpen}
            onToggleDevTools={() => setDevToolsOpen((current) => !current)}
            selectedPermit={selectedPermit}
            onChangePermit={() => {
              resetAppStateForPermitSelection();
              setSelectedPermit(null);
            }}
            voicePermission={voicePermission}
            onRequestVoicePermission={requestVoicePermission}
          />
        </div>
        <MobileBottomBar
          message={voiceState.message}
          voiceBusy={voiceState.busy || voicePlaybackActive || autoListenPendingRef.current}
          onMicClick={async () => {
            setMode("voice");
            if (voicePermission !== "granted") {
              const granted = await requestVoicePermission();
              if (granted) {
                handleVoiceTrigger({ source: "mobile-mic" });
              }
              return;
            }
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
