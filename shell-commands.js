// shell-commands.js — pure command logic for the interactive shell.

(function () {
  const FALLBACK_HANDLE = "songzhibin97";
  const FILES = ["identity.toml", ".signatures", ".contact", "README.md", "tech.json", "stack.md"];
  const DIRS = ["projects/", "talks/", "orgs/"];
  const HIDDEN = [".zshrc", ".bashrc", ".gitconfig"];

  function data() {
    return window.PROFILE_DATA || {};
  }

  function identity() {
    return data().identity || {};
  }

  function stats() {
    return data().stats || {};
  }

  function shellEnv() {
    return data().shellEnv || {};
  }

  function handle() {
    return identity().handle || FALLBACK_HANDLE;
  }

  function unixUser() {
    return shellEnv().unixUser || "bin";
  }

  function unixUid() {
    return identity().unixUid || "1000";
  }

  function githubUid() {
    return identity().ghUid || identity().uid || "49082129";
  }

  function list(value) {
    return Array.isArray(value) ? value : [];
  }

  function nowStr() {
    const now = new Date();
    const local = new Date(now.getTime() + (8 * 60 + now.getTimezoneOffset()) * 60_000);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const pad = (n) => String(n).padStart(2, "0");
    return `${days[local.getDay()]} ${months[local.getMonth()]} ${pad(local.getDate())} ${pad(local.getHours())}:${pad(local.getMinutes())}:${pad(local.getSeconds())} CST ${local.getFullYear()}`;
  }

  function uptimeStr() {
    const now = new Date();
    const local = new Date(now.getTime() + (8 * 60 + now.getTimezoneOffset()) * 60_000);
    const pad = (n) => String(n).padStart(2, "0");
    return ` ${pad(local.getHours())}:${pad(local.getMinutes())}:${pad(local.getSeconds())}  up 327 days, 14:22,  1 user,  load average: 0.42, 0.58, 0.61`;
  }

  function helpText() {
    return [
      "available commands:",
      "",
      "  info     whoami  id  pwd  date  uptime  uname  bin",
      "  files    ls  ll  cat  tree  history",
      "  shell    echo  clear  exit  fortune  sl  coffee",
      "  system   ps  top  neofetch  man",
      "  dev      git  gh  go  vim  ssh  curl",
      "  profile  stack  orgs  contrib  repos",
      "",
      "  exact stream commands replay the rich sections above",
      "  Up/Down recalls history    Tab completes    Ctrl+L clears",
    ].join("\n");
  }

  function lsCmd(args) {
    const showHidden = args.some((arg) => /^-.*a/.test(arg));
    const long = args.some((arg) => /^-.*l/.test(arg));
    const entries = [
      ...DIRS.map((name) => ({ name, kind: "d" })),
      ...FILES.map((name) => ({ name, kind: "f" })),
      ...(showHidden ? HIDDEN.map((name) => ({ name, kind: "f" })) : []),
    ];

    if (!long) return entries.map((entry) => entry.name).join("  ");

    return entries.map((entry) => {
      const perm = entry.kind === "d" ? "drwxr-xr-x" : "-rw-r--r--";
      const size = entry.kind === "d" ? "  4096" : String(120 + entry.name.length * 17).padStart(6, " ");
      return `${perm}  1 ${unixUser()} ${unixUser()} ${size} May 21 14:22 ${entry.name}`;
    }).join("\n");
  }

  function fileContent(name) {
    const id = identity();
    const s = stats();
    const pd = data();
    const files = {
      "identity.toml": () => [
        "# identity.toml",
        `name      = "${id.name || "Bin"}"`,
        `handle    = "${handle()}"`,
        `role      = "${id.role || "backend engineer"}"`,
        `location  = "${id.location || ""}"`,
        `homepage  = "${id.homepage || "https://github.com/" + handle()}"`,
        `motto.zh  = "${id.motto || ""}"`,
        `motto.en  = "${id.mottoEn || ""}"`,
        `github_id = "${githubUid()}"`,
        `tags      = [${list(id.tags).map((tag) => `"${tag}"`).join(", ")}]`,
      ].join("\n"),

      ".signatures": () => list(pd.signatures).map(
        (sig, i) => `${String(i + 1).padStart(2, "0")}. ${sig.tag}\n    ${sig.note}`
      ).join("\n") || "(no signatures configured)",

      ".contact": () => [
        `github   github.com/${handle()}`,
        `blog     ${id.homepage || ""}`,
        `region   ${id.location || ""}`,
        "open to  interesting OSS collabs",
      ].join("\n"),

      "README.md": () => [
        `# ${id.name || handle()}`,
        "",
        id.role || "backend engineer",
        "",
        `Location: ${id.location || "unknown"}`,
        "",
        "## stats",
        `- ${s.repos ?? 0} repositories`,
        `- ${s.followers ?? 0} followers`,
        `- ${s.starred ?? 0} stars given`,
        `- ${list(pd.orgs).length} organizations`,
        "",
        `> ${id.motto || ""}`,
        `> ${id.mottoEn || ""}`,
      ].join("\n"),

      "tech.json": () => JSON.stringify(
        list(pd.tech).map((item) => ({ k: item.k, level: item.level })),
        null,
        2
      ),

      "stack.md": () => list(pd.tech).map(
        (item) => `- ${item.k} [${item.level}/5] - ${list(item.v).join(", ")}`
      ).join("\n") || "(no stack configured)",

      ".zshrc": () => "# ~/.zshrc\nexport GOPATH=$HOME/go\nexport PATH=$PATH:$GOPATH/bin\nalias g=git\nalias k=kubectl",
      ".bashrc": () => "# fallback shell\nPS1='\\u@\\h:\\w\\$ '",
      ".gitconfig": () => `[user]\n  name = ${id.name || "Bin"}\n  email = ${handle()}@users.noreply.github.com\n[core]\n  editor = nvim\n[init]\n  defaultBranch = main`,
    };
    return files[name] ? files[name]() : null;
  }

  function catCmd(args) {
    if (args.length === 0) return "cat: missing operand. try 'cat README.md'.";
    return args.map((name) => {
      const clean = name.replace(/^\.\//, "");
      const content = fileContent(clean);
      if (content != null) return content;
      if (DIRS.includes(clean) || DIRS.includes(clean + "/")) return `cat: ${name}: Is a directory`;
      return `cat: ${name}: No such file or directory`;
    }).join("\n");
  }

  function uniqueProjects() {
    const pd = data();
    const seen = new Set();
    const projects = [];
    const push = (repo, source) => {
      if (!repo || !repo.name) return;
      const owner = repo.owner || handle();
      const key = `${owner}/${repo.name}`.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      projects.push({ ...repo, owner, source });
    };
    list(pd.pinned).forEach((repo) => push(repo, "pinned"));
    list(pd.ownRepos).forEach((repo) => push(repo, "own"));
    return projects;
  }

  function branchLines(items, prefix) {
    if (items.length === 0) return [`${prefix}└── (empty)`];
    return items.map((item, index) => {
      const marker = index === items.length - 1 ? "└── " : "├── ";
      return `${prefix}${marker}${item}`;
    });
  }

  function treeOutput() {
    const projects = uniqueProjects().slice(0, 10).map((repo) => {
      const target = repo.owner && repo.owner !== handle() ? ` -> ${repo.owner}/${repo.name}` : "/";
      return `${repo.name}${target}`;
    });
    const orgs = list(data().orgs).slice(0, 10).map((org) => `${org.handle || org.name}/`);
    const lines = [
      ".",
      "├── identity.toml",
      "├── .signatures",
      "├── .contact",
      "├── README.md",
      "├── tech.json",
      "├── stack.md",
      "├── projects/",
      ...branchLines(projects, "│   "),
      "├── talks/",
      "└── orgs/",
      ...branchLines(orgs, "    "),
      "",
      `${3 + projects.length + orgs.length} directories, ${FILES.length} files`,
    ];
    return lines.join("\n");
  }

  function buildProcessTable() {
    return [
      "  PID USER     %CPU  %MEM  COMMAND",
      `    1 ${unixUser().padEnd(8)} 0.0   0.1  /sbin/init`,
      `  421 ${unixUser().padEnd(8)} 1.8   3.2  tmux: server`,
      `  892 ${unixUser().padEnd(8)} 12.4  8.7  go test ./...`,
      ` 1024 ${unixUser().padEnd(8)} 6.1   2.4  nvim app.jsx`,
      ` 1337 ${unixUser().padEnd(8)} 2.1   1.4  pprof -http=:6060`,
      ` 8086 ${unixUser().padEnd(8)} 0.5   0.2  /bin/zsh`,
    ].join("\n");
  }

  function buildNeofetch() {
    const env = shellEnv();
    const s = stats();
    const info = [
      `${handle()}@arch`,
      "-----------------",
      `OS:       ${env.distro || "Arch Linux"}`,
      `Kernel:   ${env.kernel || "6.6.10"}`,
      `Shell:    ${env.shell || "zsh"}`,
      `Term:     tmux ${env.tmux || "3.4"}`,
      `Go:       ${env.goVer || "go1.22.4"}`,
      "Uptime:   327d 14h 22m",
      `Repos:    ${s.repos ?? 0}`,
      `Followers: ${s.followers ?? 0}`,
      `Orgs:     ${list(data().orgs).length}`,
    ];
    return info.join("\n");
  }

  const FORTUNES = [
    () => `${identity().motto || "Never overestimate yourself."} - ${identity().mottoEn || ""}`.trim(),
    () => "Talk is cheap. Show me the code. - Linus Torvalds",
    () => "Concurrency is not parallelism. - Rob Pike",
    () => "Clear is better than clever. - Rob Pike",
  ];

  function slTrain() {
    return [
      "                                     ____",
      "  ====        ________                ___________________",
      "  _D _|  |_______/        \\__I_I_____===__|________________|_",
      "   |(_)---  |   H\\________/ |   |        =|___ ___|      _________",
      "  | ________|___H__/__|_____/[][]~\\_______|       |   -|_________|",
      "__/ =| o |=-O=====O=====O=====O \\ ____Y___________|__|____________",
      " |/-=|___|=    ||    ||    ||    |_____/~\\___/",
    ].join("\n");
  }

  function formatCommit(commit) {
    const tag = (commit.tag || "commit").padEnd(6, " ");
    const scope = commit.scope || "core";
    return `${commit.hash || "-------"}  ${tag} (${scope}) ${commit.msg || "update"}  [${commit.repo || handle()}, ${commit.time || "recent"}]`;
  }

  function gitCmd(args) {
    const sub = args[0];
    if (sub === "status") {
      return ["On branch main", "Your branch is up to date with 'origin/main'.", "", "nothing to commit, working tree clean"].join("\n");
    }
    if (sub === "log") {
      const commits = list(data().commits);
      return commits.length ? commits.slice(0, 10).map(formatCommit).join("\n") : "(no public commit sample loaded)";
    }
    if (sub === "branch") return "* main\n  dev\n  feat/lexer\n  perf/dump-path";
    if (sub === "remote") return `origin\thttps://github.com/${handle()}/${handle()}.github.io.git (fetch)\norigin\thttps://github.com/${handle()}/${handle()}.github.io.git (push)`;
    if (sub === "config") return args.slice(1).join(" ").includes("user.name") ? (identity().name || "Bin") : "(use --list to dump)";
    if (!sub) return "usage: git <command>\n  git status | log | branch | remote | config";
    return `git: '${sub}': not handled by this profile shell.`;
  }

  function repoListText(repos) {
    return repos.map((repo) => {
      const name = repo.owner ? `${repo.owner}/${repo.name}` : repo.name;
      const meta = [repo.lang, repo.stars != null ? `${repo.stars} stars` : null, repo.role].filter(Boolean).join(" · ");
      return `${name.padEnd(38, " ")} ${meta}${meta ? "  " : ""}${repo.desc || ""}`;
    }).join("\n");
  }

  function ghCmd(args) {
    if (args[0] === "org" && args[1] === "list") return orgsText();
    if (args[0] === "repo" && args[1] === "list") {
      if (args.includes("--pinned")) return repoListText(list(data().pinned));
      const limitIndex = args.indexOf("--limit");
      const limit = limitIndex >= 0 ? Number(args[limitIndex + 1]) || 6 : 6;
      return repoListText(list(data().ownRepos).slice(0, limit));
    }
    return "usage: gh repo list [--pinned] [--limit n] | gh org list";
  }

  function goCmd(args) {
    const sub = args[0];
    const goVer = shellEnv().goVer || "go1.22.4";
    if (sub === "version") return `go version ${goVer} linux/amd64`;
    if (sub === "env") return ["GOOS=linux", "GOARCH=amd64", `GOVERSION=${goVer}`, "GOPATH=/home/bin/go", "GO111MODULE=on", "GOPROXY=https://proxy.golang.org,direct"].join("\n");
    if (sub === "build" || sub === "test" || sub === "run") return `go ${sub}: ok (simulated)`;
    return "usage: go <command>\n  go version | go env | go build | go test | go run";
  }

  function manFor(cmd) {
    const pages = {
      whoami: "WHOAMI(1)  Print the user name associated with the current effective user ID.",
      ls: "LS(1)      List directory contents. -a: include hidden -l: long format",
      cat: "CAT(1)     Concatenate files and print on the standard output.",
      git: "GIT(1)     The stupid content tracker. Try: git log",
      gh: "GH(1)      GitHub CLI. Try: gh repo list --pinned",
      go: "GO(1)      Manage Go source code. Try: go version",
    };
    return pages[cmd] || `No manual entry for ${cmd}`;
  }

  function contribSummary() {
    const counts = data().heatmap && data().heatmap.counts;
    if (!Array.isArray(counts)) {
      return [
        "public activity summary:",
        "",
        "  live public-events sample not loaded yet",
        `  commit rows available .... ${list(data().commits).length}`,
        "",
        "reload later or use cached data after GitHub public REST succeeds",
      ].join("\n");
    }

    const flat = counts.flat();
    const total = flat.reduce((sum, n) => sum + n, 0);
    const activeDays = flat.filter((n) => n > 0).length;
    let longest = 0;
    let current = 0;
    flat.forEach((n) => {
      current = n > 0 ? current + 1 : 0;
      longest = Math.max(longest, current);
    });
    const byDay = [0, 0, 0, 0, 0, 0, 0];
    counts.forEach((week) => week.forEach((n, day) => { byDay[day] += n; }));
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const busiest = byDay.reduce((best, value, index) => value > byDay[best] ? index : best, 0);

    return [
      "public activity summary (last 26 weeks):",
      "",
      `  public events .... ${total}`,
      `  active days ...... ${activeDays} / ${flat.length}`,
      `  longest streak ... ${longest} days`,
      `  busiest weekday .. ${dayNames[busiest]}`,
      `  commit sample .... ${list(data().commits).length}`,
      "",
      "source: GitHub public events API, cached in this browser",
    ].join("\n");
  }

  function orgsText() {
    const orgs = list(data().orgs);
    return orgs.length
      ? orgs.map((org) => `@${(org.handle || org.name || "").padEnd(38, " ")} ${org.note || org.name || ""}`).join("\n")
      : "(no public organizations loaded)";
  }

  function runCommand(raw, ctx) {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const parts = trimmed.split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);

    switch (cmd) {
      case "help": case "?": return helpText();
      case "whoami": return unixUser();
      case "id": return `uid=${unixUid()}(${unixUser()}) gid=${unixUid()}(${unixUser()}) groups=${unixUid()}(${unixUser()}),10(wheel),100(users),998(docker) github=${githubUid()}`;
      case "pwd": return "/home/bin";
      case "ls": return lsCmd(args);
      case "ll": return lsCmd(["-l", ...args]);
      case "la": return lsCmd(["-la", ...args]);
      case "cat": return catCmd(args);
      case "echo": return args.join(" ");
      case "clear": case "cls": ctx.clearScreen(); return null;
      case "history": return ctx.history.length === 0 ? "(no history yet)" : ctx.history.map((h, i) => `${String(i + 1).padStart(4, " ")}  ${h}`).join("\n");
      case "date": return nowStr();
      case "uname":
        if (args.includes("-a")) return `Linux arch ${shellEnv().kernel || "6.6.10"} #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux`;
        if (args.includes("-r")) return shellEnv().kernel || "6.6.10";
        return "Linux";
      case "uptime": return uptimeStr();
      case "ps": return buildProcessTable();
      case "top": return buildProcessTable() + "\n\n(this isn't really top, but close enough. press q to leave.)";
      case "tree": return treeOutput();
      case "neofetch": case "fastfetch": return buildNeofetch();
      case "fortune": return FORTUNES[Math.floor(Math.random() * FORTUNES.length)]();
      case "git": return gitCmd(args);
      case "gh": return ghCmd(args);
      case "go": return goCmd(args);
      case "sudo": return "[sudo] password for bin:\nbin is not in the sudoers file. This incident will be reported.";
      case "vim": case "vi": case "nvim": return `${cmd}: not attached to a TTY in this browser. type ':q' to exit.`;
      case ":q": case ":q!": case ":wq": return "you have escaped vim.";
      case "nano": return "nano: minimal editor unavailable in browser. try 'cat <file>' instead.";
      case "ssh": return args[0] ? `ssh: connect to host ${args[0]} port 22: this is a static page.` : "usage: ssh [-l login_name] hostname";
      case "curl": case "wget": return `${cmd}: this browser sandbox cannot open arbitrary sockets. try https://github.com/${handle()}`;
      case "rm": return "rm: read-only profile filesystem";
      case "mkdir": case "touch": case "mv": case "cp": return `${cmd}: read-only filesystem`;
      case "exit": case "logout": ctx.exit(); return null;
      case "man": return args[0] ? manFor(args[0]) : "What manual page do you want?\nFor example, try: man ls";
      case "sl": return slTrain();
      case "coffee": return "HTTP/1.1 418";
      case "yes": return Array(20).fill(args.join(" ") || "y").join("\n") + "\n(killed after 20 lines so your screen doesn't fill up.)";
      case "bin":
        if (args[0] === "--version" || args[0] === "-v") return `bin v1.0.0 (${shellEnv().goVer || "go1.22.4"}, ${shellEnv().distro || "Arch Linux"})`;
        return `bin: ${identity().role || "backend engineer"}\ntry 'bin --version', or github.com/${handle()}`;
      case "open": case "xdg-open": return `would open: ${args.join(" ") || "(nothing)"}`;
      case "stack": return list(data().tech).map((item) => `${item.k.padEnd(14, " ")} [${"▮".repeat(item.level)}${"·".repeat(5 - item.level)}]  ${list(item.v).join(", ")}`).join("\n");
      case "orgs": return orgsText();
      case "repos": return repoListText(list(data().ownRepos));
      case "contrib": return contribSummary();
      default: return `${cmd}: command not found. try 'help'.`;
    }
  }

  const COMMAND_NAMES = [
    "help", "whoami", "id", "pwd", "ls", "ll", "la", "cat", "echo", "clear", "history",
    "date", "uname", "uptime", "ps", "top", "tree", "neofetch", "fortune", "git", "gh",
    "go", "sudo", "vim", "nvim", "nano", "ssh", "curl", "rm", "exit", "logout", "man",
    "sl", "coffee", "yes", "bin", "stack", "orgs", "repos", "contrib",
  ];

  const SUBCOMMANDS = {
    git: ["status", "log", "branch", "remote", "config"],
    gh: ["repo", "org"],
    go: ["version", "env", "build", "test", "run"],
    bin: ["--version", "-v"],
    uname: ["-a", "-r"],
    ls: ["-l", "-a", "-la"],
  };

  const FILE_TAKERS = new Set(["cat", "man", "ls", "ll", "la", "rm", "tree", "open", "xdg-open"]);

  function commonPrefix(values) {
    if (values.length === 0) return "";
    let prefix = values[0];
    for (let i = 1; i < values.length; i++) {
      while (values[i].indexOf(prefix) !== 0) {
        prefix = prefix.slice(0, -1);
        if (!prefix) return "";
      }
    }
    return prefix;
  }

  function completeFor(text) {
    if (text.trim() === "") return { replace: null, list: COMMAND_NAMES };
    const endsWithSpace = /\s$/.test(text);
    const parts = text.split(/\s+/).filter(Boolean);
    const cmd = parts[0];

    if (parts.length <= 1 && !endsWithSpace) {
      const token = parts[0] || "";
      const matches = COMMAND_NAMES.filter((name) => name.startsWith(token));
      if (matches.length === 0) return { replace: null, list: [] };
      if (matches.length === 1) return { replace: matches[0] + " ", list: matches };
      const prefix = commonPrefix(matches);
      return { replace: prefix.length > token.length ? prefix : null, list: matches };
    }

    const token = endsWithSpace ? "" : parts[parts.length - 1];
    const head = endsWithSpace ? parts : parts.slice(0, -1);
    let pool = [];
    if (head.length === 1 && SUBCOMMANDS[cmd]) pool = SUBCOMMANDS[cmd];
    if (FILE_TAKERS.has(cmd)) pool = pool.concat(FILES, HIDDEN, DIRS);
    pool = Array.from(new Set(pool));

    const matches = pool.filter((item) => item.startsWith(token));
    if (matches.length === 0) return { replace: null, list: [] };
    if (matches.length === 1) return { replace: [...head, matches[0]].join(" ") + " ", list: matches };
    const prefix = commonPrefix(matches);
    if (prefix.length > token.length) return { replace: [...head, prefix].join(" "), list: matches };
    return { replace: null, list: matches };
  }

  window.SHELL = { runCommand, completeFor, COMMAND_NAMES };
})();
