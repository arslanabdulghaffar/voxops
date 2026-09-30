"use client";

import { useEffect, useRef, useState } from "react";

import type { Incident, Service } from "@/lib/voxops/scenarios";

import {
  incidentToolDefinitions,
  runIncidentTool,
  type IncidentToolResult,
  type RecoveryProposal,
} from "@/lib/voxops/incident-tools";

export type VoiceToolObservation = {
  name: string;

  arguments: Record<string, unknown>;

  result: IncidentToolResult;

  calledAt: number;
};

import { OpsIcon, StatusBadge } from "./CommandCenter";

type Props = {
  onConnectionChange?: (state: ConnectionState) => void;
  trySaying: string;
  services: Service[];

  incident: Incident | null;

  onRecoveryProposal: (proposal: RecoveryProposal) => void;

  onToolExecuted?: (name: string, result: IncidentToolResult) => void;

  onSpeechStarted?: () => void;

  /*
   * Stage 7B benchmark hooks.
   *
   * These are passive observers only.
   * They do not modify the voice-agent
   * behavior.
   */
  onUserTranscript?: (text: string) => void;

  onToolObserved?: (observation: VoiceToolObservation) => void;
};

type Message = {
  id: string;
  role: "user" | "agent";
  text: string;
};

export type ConnectionState =
  "disconnected" | "connecting" | "connected" | "error";

type ToolActivity = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  summary: string;
  result: IncidentToolResult;
  time: string;
};

type PendingToolResult = {
  callId: string;
  result: IncidentToolResult;
};

const SAMPLE_RATE = 24000;

export default function VoiceAgentPanel({
  services,
  incident,
  onRecoveryProposal,
  onToolExecuted,
  onUserTranscript,
  onToolObserved,
  onSpeechStarted,
  onConnectionChange,
  trySaying,
}: Props) {
  const [status, setStatus] = useState<ConnectionState>("disconnected");

  const [activity, setActivity] = useState<
    "listening" | "user-speaking" | "analyzing"
  >("listening");
  const [playing, setPlaying] = useState(false);
  const conversationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onConnectionChange?.(status);
  }, [status, onConnectionChange]);

  const [messages, setMessages] = useState<Message[]>([]);

  const [partialTranscript, setPartialTranscript] = useState("");

  const [error, setError] = useState<string | null>(null);

  const [toolActivity, setToolActivity] = useState<ToolActivity[]>([]);

  useEffect(() => {
    const element = conversationRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages, partialTranscript]);

  const websocketRef = useRef<WebSocket | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);

  const workletRef = useRef<AudioWorkletNode | null>(null);

  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const silentGainRef = useRef<GainNode | null>(null);

  const sessionReadyRef = useRef(false);

  const playbackTimeRef = useRef(0);

  const scheduledSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  /*
   * Keep the latest React state available
   * to tool calls without reconnecting.
   */
  const servicesRef = useRef<Service[]>(services);

  const incidentRef = useRef<Incident | null>(incident);

  const lastEventTypeRef = useRef<string | null>(null);

  const pendingToolResultsRef = useRef<PendingToolResult[]>([]);

  useEffect(() => {
    servicesRef.current = services;
    incidentRef.current = incident;

    /*
     * If the system state changes while
     * the agent is connected, update the
     * system prompt and keyterms.
     */
    const websocket = websocketRef.current;

    if (
      sessionReadyRef.current &&
      websocket &&
      websocket.readyState === WebSocket.OPEN
    ) {
      websocket.send(
        JSON.stringify({
          type: "session.update",

          session: {
            system_prompt: createSystemPrompt(services, incident),

            input: {
              keyterms: createKeyterms(services),
            },
          },
        }),
      );
    }
  }, [services, incident]);

  function createKeyterms(currentServices: Service[]) {
    return [
      "VoxOps",
      "SEV-1",
      "SEV-2",
      "SEV-3",
      "rollback",
      "deployment",
      "latency",
      ...currentServices.map((service) => service.name),
      ...currentServices.map((service) => service.version),
    ];
  }

  function createSystemPrompt(
    currentServices: Service[],
    currentIncident: Incident | null,
  ) {
    const serviceNames = currentServices
      .map((service) => `- ${service.name}`)
      .join("\n");

    const incidentContext = currentIncident
      ? `
There is currently an active incident.

Incident ID: ${currentIncident.id}
Severity: ${currentIncident.severity}
Affected service: ${currentIncident.service}
Reported symptom: ${currentIncident.title}
`
      : `
There is currently no active incident.
`;

    return `
You are VoxOps, an AI Voice Incident Commander.

You help engineers investigate production incidents using evidence.

Known production services:

${serviceNames}

${incidentContext}

IMPORTANT OPERATING RULES:

1. Tool use is mandatory for factual infrastructure investigation.

2. If the engineer says any equivalent of:
   - investigate the incident
   - diagnose the incident
   - find the cause
   - what is happening
   - what went wrong
   - analyze checkout
   then your FIRST operational action MUST be to call:
   investigate_incident

3. Do NOT verbally say that you will investigate without actually calling investigate_incident.

4. Do NOT provide an incident diagnosis before receiving tool evidence.

5. investigate_incident is the preferred first tool for a general incident investigation.

6. The individual tools:
   - get_service_metrics
   - query_service_logs
   - get_recent_deployments
   - get_dependency_health
   are mainly for specific follow-up questions.

7. Clearly distinguish:
   - observed evidence
   - likely diagnosis
   - recommended action

8. Never invent metrics, logs, versions, deployments, or incidents.

9. Keep spoken responses concise.

10. If evidence indicates a deployment regression, you may recommend rollback.

11. You are NOT allowed to execute rollback, restart, deploy, delete, or modify operations yet.

12. Any state-changing action requires the VoxOps Safety Gate.

13. Never claim a recovery action occurred unless a tool result explicitly confirms it.

14. You are not a generic assistant. Stay focused on production incident investigation.

After investigate_incident returns, summarize the important evidence and diagnosis in practical engineering language.

15. If the engineer requests a rollback, your FIRST action MUST be to call request_rollback.

16. Never say that you submitted a rollback request unless request_rollback actually succeeded.

17. request_rollback does NOT execute anything. It only opens the human Safety Gate.

18. If the engineer asks whether recovery succeeded, call verify_recovery before answering.

19. After receiving investigation evidence, respond with no more than 4 short sentences unless the engineer explicitly asks for detail.

20. Lead with the diagnosis, then give only the strongest evidence, then the recommended action.

21. Do not read every log entry or every metric aloud. Detailed evidence is already visible in the dashboard.

22. Prefer this spoken structure: Diagnosis → strongest evidence → recommended next action.
`;
  }

  function arrayBufferToBase64(buffer: ArrayBuffer) {
    const bytes = new Uint8Array(buffer);

    let binary = "";

    const chunkSize = 0x8000;

    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(
        ...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)),
      );
    }

    return btoa(binary);
  }

  function flushPlayback() {
    setPlaying(false);
    scheduledSourcesRef.current.forEach((source) => {
      try {
        source.stop();
      } catch {}
    });

    scheduledSourcesRef.current = [];

    if (audioContextRef.current) {
      playbackTimeRef.current = audioContextRef.current.currentTime;
    }
  }

  function playPCM(base64Audio: string) {
    const audioContext = audioContextRef.current;

    if (!audioContext) {
      return;
    }

    const binary = atob(base64Audio);

    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const sampleCount = Math.floor(bytes.byteLength / 2);

    const floatSamples = new Float32Array(sampleCount);

    const view = new DataView(bytes.buffer);

    for (let i = 0; i < sampleCount; i++) {
      const sample = view.getInt16(i * 2, true);

      floatSamples[i] = sample / 0x8000;
    }

    const audioBuffer = audioContext.createBuffer(
      1,
      floatSamples.length,
      SAMPLE_RATE,
    );

    audioBuffer.getChannelData(0).set(floatSamples);

    const source = audioContext.createBufferSource();

    source.buffer = audioBuffer;

    source.connect(audioContext.destination);

    const now = audioContext.currentTime;

    if (playbackTimeRef.current < now) {
      playbackTimeRef.current = now;
    }

    source.start(playbackTimeRef.current);

    playbackTimeRef.current += audioBuffer.duration;

    scheduledSourcesRef.current.push(source);
    setPlaying(true);

    source.onended = () => {
      scheduledSourcesRef.current = scheduledSourcesRef.current.filter(
        (item) => item !== source,
      );
      if (scheduledSourcesRef.current.length === 0) setPlaying(false);
    };
  }

  function addMessage(role: "user" | "agent", text: string) {
    const trimmed = text.trim();

    if (!trimmed) {
      return;
    }

    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role,
        text: trimmed,
      },
    ]);
  }

  /*
   * AssemblyAI may issue a tool call
   * while it is still producing speech.
   *
   * We buffer the result until reply.done,
   * following their recommended tool flow.
   */
  function flushPendingToolResults() {
    const websocket = websocketRef.current;

    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
      return;
    }

    if (lastEventTypeRef.current !== "reply.done") {
      return;
    }

    if (pendingToolResultsRef.current.length === 0) {
      return;
    }

    const pending = [...pendingToolResultsRef.current];

    pendingToolResultsRef.current = [];

    for (const tool of pending) {
      websocket.send(
        JSON.stringify({
          type: "tool.result",

          call_id: tool.callId,

          /*
           * AssemblyAI expects
           * result as a JSON string.
           */
          result: JSON.stringify(tool.result),
        }),
      );
    }
  }

  function handleToolCall(event: {
    call_id: string;

    name: string;

    arguments?: Record<string, unknown>;
  }) {
    setActivity("analyzing");
    const args = event.arguments ?? {};

    /*
     * Stage 7B:
     *
     * Capture the instant the actual
     * AssemblyAI tool.call reaches the
     * application.
     *
     * This is intentionally captured
     * before executing our local tool
     * logic.
     */
    const calledAt = performance.now();

    const result = runIncidentTool(
      event.name,

      args,

      {
        services: servicesRef.current,

        incident: incidentRef.current,
      },
    );

    /*
     * Existing application callback.
     */
    onToolExecuted?.(event.name, result);

    /*
     * Stage 7B passive benchmark
     * observation.
     *
     * The benchmark receives exactly
     * what AssemblyAI selected:
     *
     * - tool name
     * - generated arguments
     * - resulting safety/tool outcome
     * - arrival timestamp
     */
    onToolObserved?.({
      name: event.name,

      arguments: args,

      result,

      calledAt,
    });

    if (event.name === "request_rollback" && result.ok && result.data) {
      const data = result.data as {
        proposal?: RecoveryProposal;
      };

      if (data.proposal) {
        onRecoveryProposal(data.proposal);
      }
    }

    setToolActivity((current) => [
      ...current,

      {
        id: crypto.randomUUID(),

        name: event.name,

        arguments: args,

        summary: result.summary,

        result,

        time: new Date().toLocaleTimeString(),
      },
    ]);

    pendingToolResultsRef.current.push({
      callId: event.call_id,

      result,
    });

    /*
     * If the previous reply has already
     * finished, return immediately.
     */
    flushPendingToolResults();
  }

  async function connect() {
    if (status === "connecting") {
      return;
    }

    try {
      await cleanup();
      setActivity("listening");
      setError(null);
      setMessages([]);
      setToolActivity([]);
      setPartialTranscript("");

      setStatus("connecting");

      lastEventTypeRef.current = null;

      pendingToolResultsRef.current = [];

      const tokenResponse = await fetch("/api/voice-token", {
        cache: "no-store",
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok || !tokenData.token) {
        throw new Error(
          tokenData.details ||
            tokenData.error ||
            "Unable to obtain AssemblyAI token.",
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,

          noiseSuppression: true,

          autoGainControl: true,

          channelCount: 1,
        },
      });

      mediaStreamRef.current = stream;

      const audioContext = new AudioContext({
        sampleRate: SAMPLE_RATE,
      });

      audioContextRef.current = audioContext;

      await audioContext.resume();

      playbackTimeRef.current = audioContext.currentTime;

      await audioContext.audioWorklet.addModule("/pcm-processor.js");

      const sourceNode = audioContext.createMediaStreamSource(stream);

      sourceNodeRef.current = sourceNode;

      const workletNode = new AudioWorkletNode(audioContext, "pcm-processor");

      workletRef.current = workletNode;

      const silentGain = audioContext.createGain();

      silentGain.gain.value = 0;

      silentGainRef.current = silentGain;

      sourceNode.connect(workletNode);

      workletNode.connect(silentGain);

      silentGain.connect(audioContext.destination);

      const websocketUrl = new URL("wss://agents.assemblyai.com/v1/ws");

      websocketUrl.searchParams.set("token", tokenData.token);

      const websocket = new WebSocket(websocketUrl.toString());

      websocketRef.current = websocket;

      websocket.onopen = () => {
        websocket.send(
          JSON.stringify({
            type: "session.update",

            session: {
              system_prompt: createSystemPrompt(
                servicesRef.current,
                incidentRef.current,
              ),

              greeting: incidentRef.current
                ? `VoxOps online. I see an active ${incidentRef.current.severity} incident affecting ${incidentRef.current.service}. I can investigate metrics, logs, deployments, and dependencies.`
                : "VoxOps online. All monitored services are currently healthy.",

              tools: incidentToolDefinitions,

              output: {
                voice: "anna",
              },

              input: {
                keyterms: createKeyterms(servicesRef.current),

                turn_detection: {
                  vad_threshold: 0.5,

                  min_silence: 500,

                  max_silence: 1400,

                  interrupt_response: true,
                },
              },
            },
          }),
        );
      };

      workletNode.port.onmessage = (event) => {
        const websocket = websocketRef.current;

        if (
          !sessionReadyRef.current ||
          !websocket ||
          websocket.readyState !== WebSocket.OPEN
        ) {
          return;
        }

        websocket.send(
          JSON.stringify({
            type: "input.audio",

            audio: arrayBufferToBase64(event.data),
          }),
        );
      };

      websocket.onmessage = (messageEvent) => {
        let event;

        try {
          event = JSON.parse(messageEvent.data);
        } catch {
          return;
        }
        console.log("[AssemblyAI event]", event.type, event);

        /*
         * Tool calls are handled
         * before the general event switch.
         */
        if (event.type === "tool.call") {
          handleToolCall(event);

          return;
        }

        if (
          event.type === "reply.started" ||
          event.type === "input.speech.started"
        ) {
          lastEventTypeRef.current = event.type;
        }

        if (event.type === "input.speech.started") {
          setActivity("user-speaking");
          onSpeechStarted?.();
        }

        switch (event.type) {
          case "session.ready":
            sessionReadyRef.current = true;

            setStatus("connected");

            break;

          case "input.speech.stopped":
            setActivity("analyzing");
            break;

          case "transcript.user.delta":
            setActivity("user-speaking");
            if (event.text) {
              setPartialTranscript(event.text);
            }

            break;

          case "transcript.user":
            setActivity("analyzing");
            setPartialTranscript("");

            if (event.text) {
              const transcript = String(event.text).trim();

              if (transcript) {
                addMessage("user", transcript);

                /*
                 * Stage 7B:
                 * expose AssemblyAI's final
                 * user transcript to the live
                 * benchmark coordinator.
                 */
                onUserTranscript?.(transcript);
              }
            }

            break;

          case "transcript.agent":
            if (event.text) {
              addMessage("agent", event.text);
            }

            break;

          case "reply.audio":
            if (event.data) {
              playPCM(event.data);
            }

            break;

          case "reply.done": {
            const awaitingToolReply =
              pendingToolResultsRef.current.length > 0 &&
              event.status !== "interrupted";
            setActivity((current) =>
              event.status === "interrupted" && current === "user-speaking"
                ? current
                : awaitingToolReply
                  ? "analyzing"
                  : "listening",
            );
            lastEventTypeRef.current = "reply.done";

            if (event.status === "interrupted") {
              flushPlayback();

              pendingToolResultsRef.current = [];
            } else {
              flushPendingToolResults();
            }

            break;
          }

          case "session.error":
            console.error("AssemblyAI session error:", event);

            setError(
              event.message ||
                event.error?.message ||
                "AssemblyAI session error.",
            );

            setStatus("error");
            void cleanup();

            break;

          default:
            break;
        }
      };

      websocket.onerror = () => {
        setError("Voice WebSocket connection failed.");

        setStatus("error");
        void cleanup();
      };

      websocket.onclose = () => {
        sessionReadyRef.current = false;

        setStatus((current) =>
          current === "error" ? "error" : "disconnected",
        );
        void cleanup();
      };
    } catch (connectionError) {
      console.error(connectionError);

      setError(
        connectionError instanceof Error
          ? connectionError.message
          : "Unable to start VoxOps voice agent.",
      );

      setStatus("error");

      await cleanup();
    }
  }

  async function cleanup() {
    sessionReadyRef.current = false;

    pendingToolResultsRef.current = [];

    lastEventTypeRef.current = null;

    flushPlayback();

    if (websocketRef.current) {
      websocketRef.current.onclose = null;

      websocketRef.current.close();

      websocketRef.current = null;
    }

    if (workletRef.current) {
      try {
        workletRef.current.disconnect();
      } catch {}

      workletRef.current = null;
    }

    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch {}

      sourceNodeRef.current = null;
    }

    if (silentGainRef.current) {
      try {
        silentGainRef.current.disconnect();
      } catch {}

      silentGainRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());

      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        await audioContextRef.current.close();
      } catch {}

      audioContextRef.current = null;
    }
  }

  async function disconnect() {
    await cleanup();

    setPartialTranscript("");

    setStatus("disconnected");
  }

  const visualState =
    status !== "connected"
      ? status
      : activity === "user-speaking"
        ? "user-speaking"
        : playing
          ? "agent-speaking"
          : activity;
  const stateLabels = {
    disconnected: "Ready to connect",
    connecting: "Connecting",
    listening: "Listening",
    "user-speaking": "You are speaking",
    analyzing: "Analyzing command",
    "agent-speaking": "Agent speaking",
    error: "Connection error",
  };
  const statusText = stateLabels[visualState];
  const latestUser = [...messages]
    .reverse()
    .find((message) => message.role === "user");
  const toolLabels: Record<string, string> = {
    investigate_incident: "Investigate incident",
    get_service_metrics: "Read service metrics",
    query_service_logs: "Inspect service logs",
    get_recent_deployments: "Check deployments",
    get_dependency_health: "Inspect dependencies",
    request_rollback: "Validate rollback request",
    verify_recovery: "Verify service recovery",
  };

  return (
    <section className="panel voice-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">AssemblyAI Voice Agent</p>
          <h2>Voice Commander</h2>
        </div>
        <StatusBadge
          tone={
            status === "connected"
              ? "cyan"
              : status === "error"
                ? "red"
                : "neutral"
          }
        >
          {status === "connected"
            ? "Connected"
            : status === "connecting"
              ? "Connecting"
              : status === "error"
                ? "Error"
                : "Offline"}
        </StatusBadge>
      </div>
      <div className={`voice-stage voice-${visualState}`}>
        <div className="voice-orbit" aria-hidden="true">
          <div className="voice-orbit-inner">
            <OpsIcon kind="mic" />
          </div>
          <span className="orbit-tick tick-one" />
          <span className="orbit-tick tick-two" />
        </div>
        <p className="voice-state" role="status">
          {statusText}
        </p>
        <p className="voice-state-hint">
          {status === "connected"
            ? "Microphone active / 24 kHz PCM"
            : status === "connecting"
              ? "Establishing a secure voice session"
              : "Your incident response starts with a conversation."}
        </p>
        <div className="voice-activity" aria-hidden="true">
          {Array.from({ length: 19 }, (_, index) => (
            <span key={index} style={{ animationDelay: `${index * 65}ms` }} />
          ))}
        </div>
        <span className="activity-caption">Session activity indicator</span>
        {status === "connected" ? (
          <button
            className="button button-stop voice-control"
            onClick={disconnect}
          >
            <OpsIcon kind="mic" />
            Stop Voice Agent
          </button>
        ) : (
          <button
            className="button button-primary voice-control"
            onClick={connect}
            disabled={status === "connecting"}
          >
            <OpsIcon kind="mic" />
            {status === "connecting" ? "Connecting..." : "Start Voice Agent"}
          </button>
        )}
      </div>
      {error && (
        <div className="voice-error" role="alert">
          {error}
        </div>
      )}
      <div className="try-saying">
        <span className="eyebrow">Try saying</span>
        <p>&ldquo;{trySaying}&rdquo;</p>
      </div>
      <div className="voice-transcript">
        <div className="row-between">
          <p className="eyebrow">Latest command</p>
          <span className="micro-label">
            {partialTranscript ? "Partial transcript" : "Final transcript"}
          </span>
        </div>
        <p
          className={
            partialTranscript ? "partial-transcript" : "final-transcript"
          }
        >
          {partialTranscript ||
            latestUser?.text ||
            "Your spoken command will appear here."}
        </p>
      </div>
      <details className="conversation-details">
        <summary>
          Conversation <span>{messages.length} messages</span>
        </summary>
        <div
          ref={conversationRef}
          className="conversation-scroll"
          role="log"
          aria-label="Voice conversation"
        >
          {messages.length === 0 && (
            <p className="muted">No conversation yet.</p>
          )}
          {messages.map((message) => (
            <div className={`message message-${message.role}`} key={message.id}>
              <span className="eyebrow">
                {message.role === "user" ? "You" : "VoxOps"}
              </span>
              <p>{message.text}</p>
            </div>
          ))}
        </div>
      </details>
      <div className="tool-stream">
        <div className="row-between">
          <p className="eyebrow">Live tool execution</p>
          <span className="micro-label">
            {toolActivity.length} observed calls
          </span>
        </div>
        {toolActivity.length === 0 ? (
          <div className="tool-empty">
            <span className="tool-empty-icon">&gt;_</span>
            <p>
              Waiting for an operational command.
              <br />
              <span>Actual agent tool calls appear here.</span>
            </p>
          </div>
        ) : (
          <div
            className="tool-scroll"
            role="log"
            aria-label="Observed tool calls"
          >
            {[...toolActivity].reverse().map((tool) => (
              <article
                className={`tool-item ${tool.result.ok ? "tool-success" : "tool-blocked"}`}
                key={tool.id}
              >
                <div className="row-between">
                  <h3>{toolLabels[tool.name] ?? tool.name}</h3>
                  <StatusBadge tone={tool.result.ok ? "green" : "red"}>
                    {tool.result.ok ? "Returned" : "Blocked"}
                  </StatusBadge>
                </div>
                <div className="tool-meta">
                  <code>{tool.name}</code>
                  <time>{tool.time}</time>
                </div>
                <p>{tool.summary}</p>
                <details>
                  <summary>Tool details</summary>
                  <pre>
                    {JSON.stringify(
                      { arguments: tool.arguments, result: tool.result },
                      null,
                      2,
                    )}
                  </pre>
                </details>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
