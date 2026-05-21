// boot-sequence.jsx — BIOS → systemd → login → shell intro.
const { useState: bsUseState, useEffect: bsUseEffect } = React;

const BootStages = {
  BIOS: "bios",
  SYSTEMD: "systemd",
  LOGIN: "login",
  MOTD: "motd",
  SHELL: "shell",
  DONE: "done",
};

// Phase 1 — BIOS / kernel
const BIOS_LINES = [
  { d: 80,  t: "BIOS",   m: "POST passed · UEFI mode · secure boot off"        },
  { d: 60,  t: "MEM",    m: "memtest86 ok · 32768 MiB DDR5 @ 6000 MT/s"        },
  { d: 80,  t: "CPU",    m: "Intel(R) Core(TM) i9-13900K @ 5.40GHz × 32"       },
  { d: 60,  t: "DISK",   m: "nvme0n1 · Samsung 990 Pro 2TB · 124°C cooled ok"  },
  { d: 100, t: "GRUB",   m: "loading vmlinuz-linux 6.6.10-arch1-1 ... ok"     },
];

const SYSTEMD_LINES = [
  { d: 40, ok: true,  s: "Reached target",     m: "Local File Systems"             },
  { d: 60, ok: true,  s: "Started",            m: "Network Time Synchronization"   },
  { d: 50, ok: true,  s: "Started",            m: "D-Bus System Message Bus"       },
  { d: 60, ok: true,  s: "Started",            m: "OpenSSH Daemon"                 },
  { d: 50, ok: true,  s: "Started",            m: "Docker Application Container"   },
  { d: 60, ok: true,  s: "Started",            m: "containerd container runtime"   },
  { d: 60, ok: true,  s: "Reached target",     m: "Multi-User System"              },
  { d: 80, ok: true,  s: "Started",            m: "songzhibin97-profile.service"   },
];

const MOTD_LINES = [
  "",
  "  Welcome to Arch Linux ──────────────────────────────────────",
  "    kernel  6.6.10-arch1-1   shell  zsh 5.9   tmux  3.4",
  "    uid     49082129         user   bin",
  "    locale  zh_CN.UTF-8 · en_US.UTF-8",
  "  ────────────────────────────────────────────────────────────",
  "  Last login: Mon May 19 14:31:09 2026 from 172.16.0.42",
  "",
  '  Tip: type "help" to see what this profile can show you.',
  "",
];

function useTypewriter(text, speed = 18, run = true) {
  // When `run` is false (e.g. subsequent visits, skipped mode), short-circuit
  // BEFORE first paint so the user never sees a half-typed string flash.
  const [out, setOut] = bsUseState(run ? "" : text);
  bsUseEffect(() => {
    if (!run) { setOut(text); return; }
    setOut("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed, run]);
  return out;
}

// ─── BIOS line ─────────────────────────────────────────────────────────
function BiosLine({ line, accent }) {
  return (
    <div className="bs-line">
      <span className="bs-tag" style={{ color: accent }}>{line.t.padEnd(5)}</span>
      <span className="bs-msg">{line.m}</span>
    </div>
  );
}

// ─── systemd-style [ OK ] line ─────────────────────────────────────────
function SystemdLine({ line, accent }) {
  return (
    <div className="bs-line">
      <span className="bs-bracket">[  </span>
      <span style={{ color: line.ok ? "#5feab6" : "#e07a5f" }}>{line.ok ? "OK" : "FAIL"}</span>
      <span className="bs-bracket">  ]</span>
      <span style={{ marginLeft: 10 }}>{line.s}</span>
      <span style={{ marginLeft: 6 }}>{line.m}.</span>
    </div>
  );
}

window.BootStages = BootStages;
window.BIOS_LINES = BIOS_LINES;
window.SYSTEMD_LINES = SYSTEMD_LINES;
window.MOTD_LINES = MOTD_LINES;
window.useTypewriter = useTypewriter;
window.BiosLine = BiosLine;
window.SystemdLine = SystemdLine;

// ─── Login block ───────────────────────────────────────────────────────
function LoginBlock({ loginTyping, passwordTyping, accent }) {
  const user = useTypewriter("bin", 90, loginTyping);
  const pwDots = useTypewriter("••••••••••", 75, passwordTyping);
  return (
    <div className="bs-login">
      <div style={{ marginTop: 14 }}>
        <span className="bs-host">bin@arch</span>
        <span className="dim"> tty1 </span>
        <span style={{ color: accent }}>login: </span>
        <span>{user}</span>
        {loginTyping && !passwordTyping && <Cursor accent={accent} />}
      </div>
      {passwordTyping && (
        <div>
          <span style={{ color: accent }}>Password: </span>
          <span style={{ color: "#5feab6" }}>{pwDots}</span>
          {pwDots.length < 10 && <Cursor accent={accent} />}
        </div>
      )}
    </div>
  );
}
window.LoginBlock = LoginBlock;

// ─── Cursor (re-exported here for terminal-stream to use even though app.jsx
// also defines one; this avoids ordering dependencies across script files) ─
function Cursor({ accent }) {
  const [on, setOn] = bsUseState(true);
  bsUseEffect(() => {
    const t = setInterval(() => setOn(o => !o), 530);
    return () => clearInterval(t);
  }, []);
  return <span style={{
    display: "inline-block",
    width: "0.55em",
    height: "1em",
    background: on ? accent : "transparent",
    verticalAlign: "-2px",
    marginLeft: "2px",
  }} />;
}
window.Cursor = Cursor;
