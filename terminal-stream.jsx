// terminal-stream.jsx — One continuous Linux session.
// Boot logs → login → MOTD → commands typed inline → each output is a section.
//
// Drives all state for the animation; sections are passed in as a map so this
// component owns the visual flow, not the data.

const { useState: tsUseState, useEffect: tsUseEffect, useRef: tsUseRef } = React;

const STREAM_SEEN_KEY = "bin-profile.stream-seen.v3";

const STREAM_COMMANDS = [
  { id: "00", cmd: "cat identity.toml" },
  { id: "01", cmd: "cat .signatures" },
  { id: "02", cmd: "stack --rated" },
  { id: "03", cmd: "gh repo list --pinned songzhibin97" },
  { id: "04", cmd: "gh repo list songzhibin97 --limit 6" },
  { id: "05", cmd: "contrib --weeks 26" },
  { id: "06", cmd: "git log --author=bin -n 10 --pretty=tabular" },
  { id: "07", cmd: "gh org list" },
  { id: "08", cmd: "cat .contact" },
];

// Phases of the stream, in order. Each maps to a discrete progress value.
const PHASE_PRE_BOOT  = "pre-boot";   // nothing shown yet
const PHASE_BIOS      = "bios";       // streaming BIOS lines
const PHASE_SYSTEMD   = "systemd";    // streaming systemd OK lines
const PHASE_LOGIN     = "login";      // login + password typing
const PHASE_MOTD      = "motd";       // motd appears
const PHASE_COMMANDS  = "commands";   // shell commands + sections
const PHASE_DONE      = "done";       // final prompt with cursor

// Pull a previous-visit timestamp from localStorage; format it like a real
// `last login` line. Falls back to a plausible recent value on first visit.
const LAST_VISIT_KEY = "bin-profile.last-visit";
function formatLastLogin(date) {
  const days   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const pad = (n) => String(n).padStart(2, "0");
  return `${days[date.getDay()]} ${months[date.getMonth()]} ${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${date.getFullYear()} from 172.16.0.42`;
}
function buildMotdLines() {
  let priorVisit = null;
  try {
    const raw = localStorage.getItem(LAST_VISIT_KEY);
    if (raw) priorVisit = new Date(raw);
  } catch (e) {}

  // Pull env / identity values from profile-data.js so editing the data
  // file updates the welcome banner without touching this file.
  const id  = (window.PROFILE_DATA && window.PROFILE_DATA.identity) || {};
  const env = (window.PROFILE_DATA && window.PROFILE_DATA.shellEnv) || {};
  const rule = "─".repeat(45);
  const greeting = priorVisit ? "Welcome back to" : "Welcome to";
  const unixUid = id.unixUid || "1000";
  const ghUid = id.ghUid || id.uid || "49082129";
  const user = env.unixUser || id.handle || "bin";
  const lines = [
    `${greeting} ${env.distro || "Arch Linux"} ${rule}`,
    `  kernel  ${env.kernel || "6.6.10"}   shell  ${env.shell || "zsh"}   tmux  ${env.tmux || "3.4"}`,
    `  uid     ${unixUid}   gh_id  ${ghUid}   user   ${user}`,
    `  locale  zh_CN.UTF-8 · en_US.UTF-8`,
    "─".repeat(60),
  ];
  if (priorVisit) {
    lines.push("Last login: " + formatLastLogin(priorVisit));
  }
  lines.push("", "Tip: scroll for the full session, or use the panel for tweaks.");
  return lines;
}

function PromptLine({ accent, cmd, typing }) {
  const typed = useTypewriter(cmd, 26, typing);
  const done = !typing || typed === cmd;
  return (
    <div className="ts-prompt">
      <span style={{ color: accent }}>bin@arch</span>
      <span className="dim">:</span>
      <span style={{ color: "#9ab" }}>~</span>
      <span className="dim">$ </span>
      <span className="ts-cmd-text">{typed}</span>
      {!done && <Cursor accent={accent} />}
    </div>
  );
}

function TerminalStream({ accent, sections, skipped, onSkip, onComplete, mode }) {
  // Granular progress trackers. When `skipped`, every list is fully populated.
  const [biosIdx,   setBiosIdx]   = tsUseState(0);
  const [sysIdx,    setSysIdx]    = tsUseState(0);
  const [phase,     setPhase]     = tsUseState(PHASE_PRE_BOOT);
  const [loginType, setLoginType] = tsUseState(false);
  const [pwdType,   setPwdType]   = tsUseState(false);
  const [showMotd,  setShowMotd]  = tsUseState(false);
  const [cmdIdx,    setCmdIdx]    = tsUseState(0);     // # of commands STARTED typing
  const [outputIdx, setOutputIdx] = tsUseState(0);     // # of outputs SHOWN
  const containerRef = tsUseRef(null);

  // If the visit is being skipped (or replayed-as-skipped), jump straight to
  // the "already-booted" state: NO BIOS, NO systemd, NO login — just MOTD
  // + commands + outputs, like opening a new shell on a system that's already
  // running. Avoids replaying the kernel ceremony every page load.
  tsUseEffect(() => {
    if (!skipped) return;
    setBiosIdx(0);
    setSysIdx(0);
    setLoginType(false);
    setPwdType(false);
    setShowMotd(true);
    setCmdIdx(STREAM_COMMANDS.length);
    setOutputIdx(STREAM_COMMANDS.length);
    setPhase(PHASE_DONE);
    onComplete && onComplete();
  }, [skipped]);

  // MOTD content with dynamic "Last login" stamp, computed once per mount.
  const motdLines = React.useMemo(buildMotdLines, []);

  // Auto-scroll the window to follow new lines (only during the live run).
  tsUseEffect(() => {
    if (skipped) return;
    if (phase === PHASE_DONE || phase === PHASE_PRE_BOOT) return;
    // Smoothly scroll the page so the latest line stays in view.
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth",
    });
  }, [biosIdx, sysIdx, loginType, pwdType, showMotd, cmdIdx, outputIdx, phase, skipped]);

  // Drive the live animation.
  tsUseEffect(() => {
    if (skipped) return;
    // Reset everything to pre-boot state — critical when this effect re-fires
    // because the user clicked Replay (skipped flipped from true → false),
    // otherwise the previously "fully populated" state would still be visible.
    setBiosIdx(0);
    setSysIdx(0);
    setLoginType(false);
    setPwdType(false);
    setShowMotd(false);
    setCmdIdx(0);
    setOutputIdx(0);
    setPhase(PHASE_PRE_BOOT);

    let cancel = false;
    const timers = [];
    const wait = (ms) => new Promise(res => {
      const t = setTimeout(() => { if (!cancel) res(); }, ms);
      timers.push(t);
    });

    (async () => {
      // Initial pause so the page can paint blank for a beat.
      await wait(200);

      setPhase(PHASE_BIOS);
      for (let i = 0; i < BIOS_LINES.length; i++) {
        await wait(BIOS_LINES[i].d);
        if (cancel) return;
        setBiosIdx(i + 1);
      }
      await wait(280);

      setPhase(PHASE_SYSTEMD);
      for (let i = 0; i < SYSTEMD_LINES.length; i++) {
        await wait(SYSTEMD_LINES[i].d);
        if (cancel) return;
        setSysIdx(i + 1);
      }
      await wait(380);

      setPhase(PHASE_LOGIN);
      await wait(220);
      setLoginType(true);
      await wait(620);
      setPwdType(true);
      await wait(900);

      setPhase(PHASE_MOTD);
      setShowMotd(true);
      await wait(620);

      setPhase(PHASE_COMMANDS);
      for (let i = 0; i < STREAM_COMMANDS.length; i++) {
        // Start typing command i
        setCmdIdx(i + 1);
        // Typing duration ~ chars * speed (matches PromptLine's speed of 26ms)
        const typingMs = STREAM_COMMANDS[i].cmd.length * 26 + 220;
        await wait(typingMs);
        if (cancel) return;
        // Reveal output
        setOutputIdx(i + 1);
        // Pause before next command starts — long enough to register the
        // printed-out content (max child stagger ~720ms for 12 children).
        await wait(1200);
      }

      await wait(400);
      setPhase(PHASE_DONE);
      // Stamp this visit so next time's MOTD shows a real "Last login".
      try { localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString()); } catch (e) {}
      onComplete && onComplete();
    })();

    return () => {
      cancel = true;
      timers.forEach(clearTimeout);
    };
  }, [skipped]);

  const bootCleared = phase === PHASE_MOTD || phase === PHASE_COMMANDS || phase === PHASE_DONE;

  return (
    <div className="ts" ref={containerRef}>
      {/* BIOS phase — cleared after login */}
      {!bootCleared && BIOS_LINES.slice(0, biosIdx).map((l, i) => (
        <BiosLine key={"b" + i} line={l} accent={accent} />
      ))}

      {/* systemd phase — cleared after login */}
      {!bootCleared && SYSTEMD_LINES.slice(0, sysIdx).map((l, i) => (
        <SystemdLine key={"s" + i} line={l} accent={accent} />
      ))}

      {/* login + password — only visible during the LOGIN phase itself */}
      {!skipped && phase === PHASE_LOGIN && (
        <LoginBlock loginTyping={loginType} passwordTyping={pwdType} accent={accent} />
      )}

      {/* MOTD — brief greeting; shown on every visit */}
      {showMotd && (
        <pre className="ts-motd">{motdLines.join("\n")}</pre>
      )}

      {/* Commands + outputs */}
      {STREAM_COMMANDS.slice(0, cmdIdx).map((c, i) => {
        const typing = i === cmdIdx - 1 && outputIdx < cmdIdx && !skipped;
        const showOutput = i < outputIdx;
        return (
          <div className="ts-cmd-block" key={c.id}>
            <PromptLine accent={accent} cmd={c.cmd} typing={typing} />
            {showOutput && (
              <div className="ts-output">
                {sections[c.id]}
              </div>
            )}
          </div>
        );
      })}

      {/* Final live prompt (only after everything has run) */}
      {phase === PHASE_DONE && window.InteractiveShell && (
        <InteractiveShell accent={accent} sections={sections} />
      )}
    </div>
  );
}

window.TerminalStream = TerminalStream;
window.STREAM_COMMANDS = STREAM_COMMANDS;
window.STREAM_SEEN_KEY = STREAM_SEEN_KEY;
window.PHASE_DONE = PHASE_DONE;
