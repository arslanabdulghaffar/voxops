"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  Incident,
  Service,
} from "@/lib/voxops/scenarios";

import {
  incidentToolDefinitions,
  runIncidentTool,
  type IncidentToolResult,
  type RecoveryProposal,
} from "@/lib/voxops/incident-tools";

type Props = {
  services: Service[];
  incident: Incident | null;

  onRecoveryProposal: (
    proposal: RecoveryProposal
  ) => void;

  onToolExecuted?: (
    name: string,
    result: IncidentToolResult
  ) => void;
};

type Message = {
  id: string;
  role: "user" | "agent";
  text: string;
};

type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

type ToolActivity = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  summary: string;
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
}: Props) {
  const [status, setStatus] =
    useState<ConnectionState>(
      "disconnected"
    );

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [
    partialTranscript,
    setPartialTranscript,
  ] = useState("");

  const [error, setError] =
    useState<string | null>(null);

  const [
    toolActivity,
    setToolActivity,
  ] = useState<ToolActivity[]>([]);

  const websocketRef =
    useRef<WebSocket | null>(null);

  const audioContextRef =
    useRef<AudioContext | null>(null);

  const mediaStreamRef =
    useRef<MediaStream | null>(null);

  const workletRef =
    useRef<AudioWorkletNode | null>(
      null
    );

  const sourceNodeRef =
    useRef<MediaStreamAudioSourceNode | null>(
      null
    );

  const silentGainRef =
    useRef<GainNode | null>(null);

  const sessionReadyRef =
    useRef(false);

  const playbackTimeRef =
    useRef(0);

  const scheduledSourcesRef =
    useRef<AudioBufferSourceNode[]>([]);

  /*
   * Keep the latest React state available
   * to tool calls without reconnecting.
   */
  const servicesRef =
    useRef<Service[]>(services);

  const incidentRef =
    useRef<Incident | null>(incident);

  const lastEventTypeRef =
    useRef<string | null>(null);

  const pendingToolResultsRef =
    useRef<PendingToolResult[]>([]);

  useEffect(() => {
    servicesRef.current = services;
    incidentRef.current = incident;

    /*
     * If the system state changes while
     * the agent is connected, update the
     * system prompt and keyterms.
     */
    const websocket =
      websocketRef.current;

    if (
      sessionReadyRef.current &&
      websocket &&
      websocket.readyState ===
        WebSocket.OPEN
    ) {
      websocket.send(
        JSON.stringify({
          type: "session.update",

          session: {
            system_prompt:
              createSystemPrompt(
                services,
                incident
              ),

            input: {
              keyterms:
                createKeyterms(
                  services
                ),
            },
          },
        })
      );
    }
  }, [services, incident]);

  function createKeyterms(
    currentServices: Service[]
  ) {
    return [
      "VoxOps",
      "SEV-1",
      "SEV-2",
      "SEV-3",
      "rollback",
      "deployment",
      "latency",
      ...currentServices.map(
        (service) => service.name
      ),
      ...currentServices.map(
        (service) => service.version
      ),
    ];
  }

  function createSystemPrompt(
    currentServices: Service[],
    currentIncident: Incident | null
  ) {
    const serviceNames =
      currentServices
        .map(
          (service) =>
            `- ${service.name}`
        )
        .join("\n");

    const incidentContext =
      currentIncident
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

  function arrayBufferToBase64(
    buffer: ArrayBuffer
  ) {
    const bytes =
      new Uint8Array(buffer);

    let binary = "";

    const chunkSize = 0x8000;

    for (
      let i = 0;
      i < bytes.length;
      i += chunkSize
    ) {
      binary +=
        String.fromCharCode(
          ...bytes.subarray(
            i,
            Math.min(
              i + chunkSize,
              bytes.length
            )
          )
        );
    }

    return btoa(binary);
  }

  function flushPlayback() {
    scheduledSourcesRef.current.forEach(
      (source) => {
        try {
          source.stop();
        } catch {}
      }
    );

    scheduledSourcesRef.current = [];

    if (audioContextRef.current) {
      playbackTimeRef.current =
        audioContextRef.current.currentTime;
    }
  }

  function playPCM(
    base64Audio: string
  ) {
    const audioContext =
      audioContextRef.current;

    if (!audioContext) {
      return;
    }

    const binary =
      atob(base64Audio);

    const bytes =
      new Uint8Array(
        binary.length
      );

    for (
      let i = 0;
      i < binary.length;
      i++
    ) {
      bytes[i] =
        binary.charCodeAt(i);
    }

    const sampleCount =
      Math.floor(
        bytes.byteLength / 2
      );

    const floatSamples =
      new Float32Array(
        sampleCount
      );

    const view =
      new DataView(bytes.buffer);

    for (
      let i = 0;
      i < sampleCount;
      i++
    ) {
      const sample =
        view.getInt16(
          i * 2,
          true
        );

      floatSamples[i] =
        sample / 0x8000;
    }

    const audioBuffer =
      audioContext.createBuffer(
        1,
        floatSamples.length,
        SAMPLE_RATE
      );

    audioBuffer
      .getChannelData(0)
      .set(floatSamples);

    const source =
      audioContext.createBufferSource();

    source.buffer =
      audioBuffer;

    source.connect(
      audioContext.destination
    );

    const now =
      audioContext.currentTime;

    if (
      playbackTimeRef.current <
      now
    ) {
      playbackTimeRef.current =
        now;
    }

    source.start(
      playbackTimeRef.current
    );

    playbackTimeRef.current +=
      audioBuffer.duration;

    scheduledSourcesRef.current.push(
      source
    );

    source.onended = () => {
      scheduledSourcesRef.current =
        scheduledSourcesRef.current.filter(
          (item) =>
            item !== source
        );
    };
  }

  function addMessage(
    role: "user" | "agent",
    text: string
  ) {
    const trimmed =
      text.trim();

    if (!trimmed) {
      return;
    }

    setMessages(
      (current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role,
          text: trimmed,
        },
      ]
    );
  }

  /*
   * AssemblyAI may issue a tool call
   * while it is still producing speech.
   *
   * We buffer the result until reply.done,
   * following their recommended tool flow.
   */
  function flushPendingToolResults() {
    const websocket =
      websocketRef.current;

    if (
      !websocket ||
      websocket.readyState !==
        WebSocket.OPEN
    ) {
      return;
    }

    if (
      lastEventTypeRef.current !==
      "reply.done"
    ) {
      return;
    }

    if (
      pendingToolResultsRef.current
        .length === 0
    ) {
      return;
    }

    const pending = [
      ...pendingToolResultsRef.current,
    ];

    pendingToolResultsRef.current =
      [];

    for (const tool of pending) {
      websocket.send(
        JSON.stringify({
          type: "tool.result",

          call_id:
            tool.callId,

          /*
           * AssemblyAI expects
           * result as a JSON string.
           */
          result:
            JSON.stringify(
              tool.result
            ),
        })
      );
    }
  }

  function handleToolCall(
    event: {
      call_id: string;
      name: string;
      arguments?: Record<
        string,
        unknown
      >;
    }
  ) {
    const args =
      event.arguments ?? {};

    const result =
  runIncidentTool(
    event.name,
    args,
    {
      services:
        servicesRef.current,

      incident:
        incidentRef.current,
    }
  );
  onToolExecuted?.(
  event.name,
  result
);

if (
  event.name ===
    "request_rollback" &&
  result.ok &&
  result.data
) {
  const data =
    result.data as {
      proposal?: RecoveryProposal;
    };

  if (data.proposal) {
    onRecoveryProposal(
      data.proposal
    );
  }
}

    setToolActivity(
      (current) => [
        ...current,
        {
          id:
            crypto.randomUUID(),

          name:
            event.name,

          arguments: args,

          summary:
            result.summary,

          time:
            new Date()
              .toLocaleTimeString(),
        },
      ]
    );

    pendingToolResultsRef.current.push(
      {
        callId:
          event.call_id,

        result,
      }
    );

    /*
     * If the previous reply has already
     * finished, return immediately.
     */
    flushPendingToolResults();
  }

  async function connect() {
    if (
      status === "connecting"
    ) {
      return;
    }

    try {
      setError(null);
      setMessages([]);
      setToolActivity([]);
      setPartialTranscript("");

      setStatus(
        "connecting"
      );

      lastEventTypeRef.current =
        null;

      pendingToolResultsRef.current =
        [];

      const tokenResponse =
        await fetch(
          "/api/voice-token",
          {
            cache:
              "no-store",
          }
        );

      const tokenData =
        await tokenResponse.json();

      if (
        !tokenResponse.ok ||
        !tokenData.token
      ) {
        throw new Error(
          tokenData.details ||
            tokenData.error ||
            "Unable to obtain AssemblyAI token."
        );
      }

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            audio: {
              echoCancellation:
                true,

              noiseSuppression:
                true,

              autoGainControl:
                true,

              channelCount: 1,
            },
          }
        );

      mediaStreamRef.current =
        stream;

      const audioContext =
        new AudioContext({
          sampleRate:
            SAMPLE_RATE,
        });

      audioContextRef.current =
        audioContext;

      await audioContext.resume();

      playbackTimeRef.current =
        audioContext.currentTime;

      await audioContext.audioWorklet.addModule(
        "/pcm-processor.js"
      );

      const sourceNode =
        audioContext.createMediaStreamSource(
          stream
        );

      sourceNodeRef.current =
        sourceNode;

      const workletNode =
        new AudioWorkletNode(
          audioContext,
          "pcm-processor"
        );

      workletRef.current =
        workletNode;

      const silentGain =
        audioContext.createGain();

      silentGain.gain.value = 0;

      silentGainRef.current =
        silentGain;

      sourceNode.connect(
        workletNode
      );

      workletNode.connect(
        silentGain
      );

      silentGain.connect(
        audioContext.destination
      );

      const websocketUrl =
        new URL(
          "wss://agents.assemblyai.com/v1/ws"
        );

      websocketUrl.searchParams.set(
        "token",
        tokenData.token
      );

      const websocket =
        new WebSocket(
          websocketUrl.toString()
        );

      websocketRef.current =
        websocket;

      websocket.onopen = () => {
        websocket.send(
          JSON.stringify({
            type:
              "session.update",

            session: {
              system_prompt:
                createSystemPrompt(
                  servicesRef.current,
                  incidentRef.current
                ),

              greeting:
                incidentRef.current
                  ? `VoxOps online. I see an active ${incidentRef.current.severity} incident affecting ${incidentRef.current.service}. I can investigate metrics, logs, deployments, and dependencies.`
                  : "VoxOps online. All monitored services are currently healthy.",

              tools:
                incidentToolDefinitions,

              output: {
                voice:
                  "anna",
              },

              input: {
                keyterms:
                  createKeyterms(
                    servicesRef.current
                  ),

                turn_detection: {
                  vad_threshold:
                    0.5,

                  min_silence:
                    500,

                  max_silence:
                    1400,

                  interrupt_response:
                    true,
                },
              },
            },
          })
        );
      };

      workletNode.port.onmessage =
        (event) => {
          const websocket =
            websocketRef.current;

          if (
            !sessionReadyRef.current ||
            !websocket ||
            websocket.readyState !==
              WebSocket.OPEN
          ) {
            return;
          }

          websocket.send(
            JSON.stringify({
              type:
                "input.audio",

              audio:
                arrayBufferToBase64(
                  event.data
                ),
            })
          );
        };

      websocket.onmessage =
        (messageEvent) => {
          let event;

          try {
            event =
              JSON.parse(
                messageEvent.data
              );
          } catch {
            return;
          }
          console.log(
            "[AssemblyAI event]",
            event.type,
            event
          );

          /*
           * Tool calls are handled
           * before the general event switch.
           */
          if (
            event.type ===
            "tool.call"
          ) {
            handleToolCall(
              event
            );

            return;
          }

          if (
            event.type ===
              "reply.started" ||
            event.type ===
              "input.speech.started"
          ) {
            lastEventTypeRef.current =
              event.type;
          }

          switch (
            event.type
          ) {
            case "session.ready":
              sessionReadyRef.current =
                true;

              setStatus(
                "connected"
              );

              break;

            case "transcript.user.delta":
              if (
                event.text
              ) {
                setPartialTranscript(
                  event.text
                );
              }

              break;

            case "transcript.user":
              setPartialTranscript(
                ""
              );

              if (
                event.text
              ) {
                addMessage(
                  "user",
                  event.text
                );
              }

              break;

            case "transcript.agent":
              if (
                event.text
              ) {
                addMessage(
                  "agent",
                  event.text
                );
              }

              break;

            case "reply.audio":
              if (
                event.data
              ) {
                playPCM(
                  event.data
                );
              }

              break;

            case "reply.done":
              lastEventTypeRef.current =
                "reply.done";

              if (
                event.status ===
                "interrupted"
              ) {
                flushPlayback();

                pendingToolResultsRef.current =
                  [];
              } else {
                flushPendingToolResults();
              }

              break;

            case "session.error":
              console.error(
                "AssemblyAI session error:",
                event
              );

              setError(
                event.message ||
                  event.error
                    ?.message ||
                  "AssemblyAI session error."
              );

              setStatus(
                "error"
              );

              break;

            default:
              break;
          }
        };

      websocket.onerror =
        () => {
          setError(
            "Voice WebSocket connection failed."
          );

          setStatus(
            "error"
          );
        };

      websocket.onclose =
        () => {
          sessionReadyRef.current =
            false;

          setStatus(
            (current) =>
              current ===
              "error"
                ? "error"
                : "disconnected"
          );
        };
    } catch (
      connectionError
    ) {
      console.error(
        connectionError
      );

      setError(
        connectionError instanceof
          Error
          ? connectionError.message
          : "Unable to start VoxOps voice agent."
      );

      setStatus(
        "error"
      );

      await cleanup();
    }
  }

  async function cleanup() {
    sessionReadyRef.current =
      false;

    pendingToolResultsRef.current =
      [];

    lastEventTypeRef.current =
      null;

    flushPlayback();

    if (
      websocketRef.current
    ) {
      websocketRef.current.onclose =
        null;

      websocketRef.current.close();

      websocketRef.current =
        null;
    }

    if (
      workletRef.current
    ) {
      try {
        workletRef.current.disconnect();
      } catch {}

      workletRef.current =
        null;
    }

    if (
      sourceNodeRef.current
    ) {
      try {
        sourceNodeRef.current.disconnect();
      } catch {}

      sourceNodeRef.current =
        null;
    }

    if (
      silentGainRef.current
    ) {
      try {
        silentGainRef.current.disconnect();
      } catch {}

      silentGainRef.current =
        null;
    }

    if (
      mediaStreamRef.current
    ) {
      mediaStreamRef.current
        .getTracks()
        .forEach(
          (track) =>
            track.stop()
        );

      mediaStreamRef.current =
        null;
    }

    if (
      audioContextRef.current
    ) {
      try {
        await audioContextRef.current.close();
      } catch {}

      audioContextRef.current =
        null;
    }
  }

  async function disconnect() {
    await cleanup();

    setPartialTranscript(
      ""
    );

    setStatus(
      "disconnected"
    );
  }

  const statusText = {
    disconnected: "Offline",
    connecting:
      "Connecting...",
    connected:
      "Listening",
    error:
      "Connection error",
  }[status];

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">
              VoxOps Voice Command
            </h2>

            <span
              className={`rounded-full px-2.5 py-1 text-xs ${
                status ===
                "connected"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : status ===
                    "error"
                  ? "bg-red-500/10 text-red-400"
                  : status ===
                    "connecting"
                  ? "bg-yellow-500/10 text-yellow-400"
                  : "bg-white/5 text-gray-400"
              }`}
            >
              ● {statusText}
            </span>
          </div>

          <p className="mt-1 text-sm text-gray-500">
            AssemblyAI voice reasoning with live incident tools.
          </p>
        </div>

        {status ===
        "connected" ? (
          <button
            onClick={
              disconnect
            }
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-5 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/20"
          >
            Disconnect Voice
          </button>
        ) : (
          <button
            onClick={
              connect
            }
            disabled={
              status ===
              "connecting"
            }
            className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status ===
            "connecting"
              ? "Connecting..."
              : "Start Voice Agent"}
          </button>
        )}
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">

        {/* Conversation */}
        <div className="min-h-[220px] rounded-xl border border-white/10 bg-black/20 p-4">

          <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-gray-600">
            Voice Conversation
          </p>

          {messages.length ===
            0 &&
          !partialTranscript ? (
            <div className="flex min-h-[160px] items-center justify-center">
              <p className="max-w-md text-center text-sm text-gray-500">
                Trigger an incident, start the voice agent, and ask VoxOps to investigate it.
              </p>
            </div>
          ) : (
            <div className="space-y-4">

              {messages.map(
                (
                  message
                ) => (
                  <div
                    key={
                      message.id
                    }
                    className={
                      message.role ===
                      "user"
                        ? "ml-auto max-w-2xl rounded-xl bg-violet-500/10 p-3"
                        : "mr-auto max-w-2xl rounded-xl bg-white/5 p-3"
                    }
                  >
                    <p className="mb-1 text-xs uppercase tracking-wider text-gray-500">
                      {message.role ===
                      "user"
                        ? "Engineer"
                        : "VoxOps"}
                    </p>

                    <p className="text-sm text-gray-200">
                      {
                        message.text
                      }
                    </p>
                  </div>
                )
              )}

              {partialTranscript && (
                <div className="ml-auto max-w-2xl rounded-xl border border-violet-500/20 bg-violet-500/5 p-3">

                  <p className="mb-1 text-xs uppercase tracking-wider text-violet-400">
                    Listening...
                  </p>

                  <p className="text-sm italic text-gray-400">
                    {
                      partialTranscript
                    }
                  </p>

                </div>
              )}
            </div>
          )}
        </div>

        {/* Tool Activity */}
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">

          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-600">
              Investigation Tools
            </p>

            <span className="text-xs text-gray-600">
              {
                toolActivity.length
              }{" "}
              calls
            </span>
          </div>

          {toolActivity.length ===
          0 ? (
            <div className="flex min-h-[160px] items-center justify-center text-center">

              <p className="max-w-xs text-sm text-gray-600">
                Tool calls will appear here when VoxOps investigates evidence.
              </p>

            </div>
          ) : (
            <div className="mt-4 space-y-3">

              {toolActivity.map(
                (
                  tool,
                  index
                ) => (
                  <div
                    key={
                      tool.id
                    }
                    className="rounded-lg border border-violet-500/15 bg-violet-500/[0.04] p-3"
                  >

                    <div className="flex items-center justify-between gap-3">

                      <p className="text-xs font-medium text-violet-400">
                        {String(
                          index +
                            1
                        ).padStart(
                          2,
                          "0"
                        )}{" "}
                        {
                          tool.name
                        }
                      </p>

                      <span className="text-[10px] text-gray-600">
                        {
                          tool.time
                        }
                      </span>

                    </div>

                    <p className="mt-2 text-xs leading-5 text-gray-400">
                      {
                        tool.summary
                      }
                    </p>

                  </div>
                )
              )}

            </div>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] p-3">

  <p className="text-xs text-emerald-300">
    Human-controlled operations
  </p>

  <p className="mt-1 text-xs text-gray-500">
    VoxOps can investigate incidents and propose recovery actions. State-changing operations execute only after explicit human approval through the Safety Gate.
  </p>

</div>
    </section>
  );
}