// interactive-shell.jsx — live prompt shown after the streamed session.

const { useState: ishState, useEffect: ishEffect, useRef: ishRef } = React;

function PromptLabel({ accent }) {
  return (
    <span className="ish-label">
      <span style={{ color: accent }}>bin@arch</span>
      <span className="dim">:</span>
      <span className="ish-cwd">~</span>
      <span className="dim">$&nbsp;</span>
    </span>
  );
}

function InteractiveShell({ accent, sections }) {
  const streamCommandMap = React.useMemo(() => {
    const map = {};
    (window.STREAM_COMMANDS || []).forEach((command) => {
      map[command.cmd] = command.id;
    });
    return map;
  }, []);

  const [entries, setEntries] = ishState([
    { kind: "out", text: "interactive shell ready. type 'help' for commands, or 'neofetch' for a fun start.\nUp/Down recalls history · Tab completes · Ctrl+L clears." },
  ]);
  const [input, setInput] = ishState("");
  const [history, setHistory] = ishState([]);
  const [histIdx, setHistIdx] = ishState(-1);
  const [draft, setDraft] = ishState("");
  const [exited, setExited] = ishState(false);
  const [lastTab, setLastTab] = ishState("");
  const inputRef = ishRef(null);

  ishEffect(() => {
    inputRef.current && inputRef.current.focus();
  }, []);

  ishEffect(() => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth",
    });
  }, [entries, exited]);

  function submit() {
    const raw = input;
    const trimmed = raw.trim();
    setInput("");
    setHistIdx(-1);
    setDraft("");

    if (trimmed) {
      setHistory((prev) => (prev[prev.length - 1] === raw ? prev : [...prev, raw]));
    }

    const streamId = streamCommandMap[trimmed];
    if (streamId && sections && sections[streamId]) {
      setEntries((prev) => [
        ...prev,
        { kind: "prompt", cmd: raw },
        { kind: "node", node: sections[streamId] },
      ]);
      return;
    }

    let effect = "append";
    const localCtx = {
      history,
      clearScreen: () => { effect = "clear"; },
      exit: () => { effect = "exit"; },
    };
    const out = window.SHELL.runCommand(raw, localCtx);

    if (effect === "clear") {
      setEntries([]);
      return;
    }

    setEntries((prev) => {
      const next = [...prev, { kind: "prompt", cmd: raw }];
      if (out != null && out !== "") next.push({ kind: "out", text: out });
      return next;
    });
    if (effect === "exit") setExited(true);
  }

  function onKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      if (histIdx < 0) setDraft(input);
      const nextIdx = histIdx < 0 ? history.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(nextIdx);
      setInput(history[nextIdx]);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIdx < 0) return;
      const nextIdx = histIdx + 1;
      if (nextIdx >= history.length) {
        setHistIdx(-1);
        setInput(draft);
        return;
      }
      setHistIdx(nextIdx);
      setInput(history[nextIdx]);
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const completion = window.SHELL.completeFor(input);
      if (completion.replace && completion.replace !== input) {
        setInput(completion.replace);
        setLastTab(completion.replace);
      } else if (completion.list.length > 1) {
        if (lastTab === input) {
          setEntries((prev) => [
            ...prev,
            { kind: "prompt", cmd: input },
            { kind: "out", text: completion.list.join("  ") },
          ]);
          setLastTab("");
        } else {
          setLastTab(input);
        }
      }
      return;
    }
    if (e.ctrlKey && (e.key === "l" || e.key === "L")) {
      e.preventDefault();
      setEntries([]);
      return;
    }
    if (e.ctrlKey && (e.key === "c" || e.key === "C")) {
      const selected = window.getSelection && window.getSelection().toString();
      if (selected) return;
      e.preventDefault();
      setEntries((prev) => [...prev, { kind: "prompt", cmd: input + "^C" }]);
      setInput("");
      setHistIdx(-1);
      return;
    }
    if (e.ctrlKey && (e.key === "u" || e.key === "U")) {
      e.preventDefault();
      setInput("");
    }
  }

  function reopen() {
    setExited(false);
    setEntries([{ kind: "out", text: "shell reopened. type 'help' if you've forgotten what's here." }]);
    setInput("");
    setHistIdx(-1);
    setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
  }

  function renderEntry(entry, index) {
    if (entry.kind === "prompt") {
      return (
        <div className="ish-row ish-prompt-row" key={index}>
          <PromptLabel accent={accent} />
          <span className="ish-cmd">{entry.cmd}</span>
        </div>
      );
    }
    if (entry.kind === "node") {
      return <div className="ish-node ts-output" key={index}>{entry.node}</div>;
    }
    return <pre className="ish-out" key={index}>{entry.text}</pre>;
  }

  if (exited) {
    return (
      <div className="ish ish-exited">
        {entries.map(renderEntry)}
        <div className="ish-row ish-prompt-row">
          <PromptLabel accent={accent} />
          <span className="ish-cmd">logout</span>
        </div>
        <div className="ish-bye dim">
          Connection to bin@arch closed.{" "}
          <button className="ish-relogin" onClick={reopen} style={{ color: accent }}>
            [reconnect]
          </button>
          {"  or press "}<kbd>R</kbd>{" to replay the whole boot."}
        </div>
      </div>
    );
  }

  return (
    <div className="ish" onMouseDown={(e) => {
      if (e.target.tagName !== "INPUT" && !window.getSelection().toString()) {
        setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
      }
    }}>
      {entries.map(renderEntry)}
      <div className="ish-row ish-input-row">
        <PromptLabel accent={accent} />
        <input
          ref={inputRef}
          className="ish-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          autoFocus
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          style={{ caretColor: accent }}
          aria-label="terminal input"
        />
      </div>
    </div>
  );
}

window.InteractiveShell = InteractiveShell;
