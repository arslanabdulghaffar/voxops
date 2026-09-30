# Stage 8 review

Branch: `stage-8-command-center-ui`. No merge or deployment is part of this stage.

## What changed

- Three persistent product views: Command Center, Evaluation, and Audit & Postmortem. Switching views keeps the voice component mounted and retains evaluation state.
- A three-column operational workspace, Geist typography, SVG branding, restrained service-status colors, and responsive layouts.
- Voice activity states derived from session events and actual scheduled audio playback. The activity animation is a session indicator, not an amplitude waveform.
- Tool activity displays only observed calls, with readable summaries and expandable arguments/results.
- Investigation evidence and diagnosis appear from returned tool data. Scenario descriptions contain neutral symptoms; recovery command hints appear after investigation returns a stable deployment.
- Policy rejection and human rejection have distinct states. An unsupported request never creates approval controls. A previously validated proposal remains separately labeled and actionable, preserving the existing authorization behavior.
- Safety timeline styling and factual draft postmortem wording. Copy and download controls remain available.
- MIT license, safe `.env.example`, metadata, and a concise README update.

## Verification performed

- `npm run lint`: passed.
- `npm run build`: passed, including TypeScript and static generation.
- Existing deterministic evaluation: 11/11 checks passed in the browser. Results persisted across view changes.
- At 1440, 1280, 768, and 390 CSS pixels: no document-level horizontal overflow in the three views, including deterministic results and Payment policy rejection. Evaluation tables retain their own horizontal scrolling.
- Browser checks found no page exceptions or duplicate IDs.
- Isolated transport fixtures exercised Checkout investigation, proposal, explicit approval, rollback, verification, and report copy/download; Payment rejection with no approval control and version unchanged; and Auth human rejection with version unchanged.
- These fixtures used the actual deterministic tools but substituted the microphone/WebSocket transport. They are UI integration checks, **not live AssemblyAI benchmark runs**. No Stage 7B results were fabricated or recorded.
- Core tool policies, scenarios, six live benchmark definitions/scoring, token endpoint, audio worklet, and dependencies are unchanged. AST comparisons also checked the 11-test evaluation builder/scoring, benchmark coordinator, voice prompt/keyterms, PCM encoding, and tool-result buffering.
- `.env.local` remains ignored; `.env.example` contains a placeholder only.

## Live browser acceptance

Use a normal browser with microphone permission and a server-side AssemblyAI key. The live microphone, transcription, spoken playback, and interruption path still require a real spoken pass.

1. **Checkout:** Reset Environment → Checkout Release Regression → Trigger Incident → Start Voice Agent. Say “Investigate the Checkout API incident.” Confirm `investigate_incident`, observed evidence, and diagnosis. Say “Rollback Checkout API to v2.13.” Confirm `request_rollback`, policy validation, and an awaiting-approval gate. Version must remain v2.14 until you click Approve Rollback. After it changes to v2.13, ask to verify recovery. Confirm `verify_recovery`, the verified pipeline state, and the audit/report. Test Copy Report and Download .txt.
2. **Payment:** Reset → Payment Provider Degradation → Trigger Incident. Say “Investigate the Payment API incident.” Confirm AtlasPay evidence. Say “Rollback Payment API to v3.7.” Confirm `ROLLBACK_NOT_VALIDATED`, a locked human gate, no approval button, and Payment remaining on v3.8. Confirm the Safety event in Audit & Postmortem.
3. **Human rejection:** Trigger Checkout or Authentication, investigate, request its supported target, then Reject Action. Confirm the service version is unchanged and the report describes rejection rather than execution.
4. **Voice continuity:** Switch between all three views during a session. Confirm it stays connected; speak again, interrupt an agent reply, and stop the session. Confirm microphone capture stops. Also check a denied microphone permission and retry.
5. **Stage 7A:** In Evaluation, Run Evaluation and confirm all 11 existing checks. Download JSON, switch views, and confirm the results remain visible.
6. **Stage 7B:** Start the voice session in Command Center, then open Evaluation. For each of the six existing cases, prepare its scenario, start the trial, and speak the displayed command. Inspect the actual transcript, first operational tool, arguments, safety outcome, and Voice → Tool latency. Download JSON. Re-running a case should replace its result. These measurements include endpointing, transcription, reasoning, network communication, and routing.

## Screenshots to capture

Use 1440px or wider for the primary review; 2560×1440 is suitable for the demo recording. Capture these from a real voice session when showing connection or transcript evidence:

1. Healthy Command Center with all three columns and the simulation label.
2. Checkout investigation and a pending human approval gate, before approval.
3. Payment policy rejection showing the requested v3.7 target, `ROLLBACK_NOT_VALIDATED`, AtlasPay evidence, the locked gate, and current v3.8 service version.
4. Evaluation with the newly run 11-check matrix; capture live benchmark results separately after real spoken trials.
5. Verified recovery with the full audit timeline and final postmortem.
6. A 390px mobile view showing the Voice Commander and reachable controls.
