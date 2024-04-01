// profile-data.js
// ─────────────────────────────────────────────────────────────────────────
// Single source of truth for everything shown on the profile page.
// Edit this file (NOT app.jsx) to update bin's data.
//
// Each section is annotated with:
//   [real]      Pulled from the actual GitHub profile / org membership.
//   [curated]   Hand-curated (taste, ratings, ordering — author's choice).
//   [fallback]  Used when GitHub's unauthenticated public API is unavailable.
//
// Want to wire this up to the GitHub API later? See profile-source.js for
// the loader hook — replace its static return with an async fetcher and the
// rest of the page picks up the new data without changes.
// ─────────────────────────────────────────────────────────────────────────

window.PROFILE_DATA = {

  // [real] basic identity from github.com/songzhibin97
  identity: {
    handle:   "songzhibin97",
    name:     "Bin",
    location: "XI'AN, CN",
    motto:    "永远不要高看自己",
    mottoEn:  "Never overestimate yourself.",
    homepage: "cnblogs.com/binHome",
    uid:      "49082129",
    unixUid:  "1000",
    ghUid:    "49082129",
    role:     "backend engineer · open-source maintainer",
    tags:     ["go", "microservices", "performance", "compilers"],
  },

  // [real] public counts (snapshot — refresh when needed)
  stats: {
    repos:     107,
    followers: 152,
    starred:   72,
    following: 11,
  },

  // [real, curated] 6 most relevant repos — mix of authored / maintained / contributed.
  // role ∈ "author" | "maintainer" | "contributor"
  pinned: [
    { name: "gkit",          owner: "songzhibin97",      lang: "Go", stars: 339,   forks: 50,   desc: "A collection of basic usability components for micro-services and single services — drawing on kratos, go-kit, mosn, sentinel patterns.", role: "author" },
    { name: "go-baseutils",  owner: "songzhibin97",      lang: "Go", stars: 19,    forks: 3,    desc: "Basic tool set for Go 1.18+ generics. Type-safe collections, functional helpers, generic algorithms.", role: "author" },
    { name: "holmes",        owner: "mosn",              lang: "Go", stars: 1100,  forks: 138,  desc: "Self-aware Golang profile dumper — auto-pprof when CPU / memory / goroutine thresholds breached.", role: "maintainer" },
    { name: "kratos",        owner: "go-kratos",         lang: "Go", stars: 25600, forks: 4200, desc: "Ultimate Go microservices framework for the cloud-native era. gRPC + REST, OpenTelemetry, multi-registry.", role: "contributor" },
    { name: "gin-vue-admin", owner: "flipped-aurora",    lang: "Go", stars: 24500, forks: 7000, desc: "Vite+Vue3+Gin AI-assisted platform — JWT auth, RBAC, dynamic routing, code generator, MCP services.", role: "contributor" },
    { name: "ddia",          owner: "Vonng",             lang: "—",  stars: 22800, forks: 4500, desc: "Designing Data-Intensive Applications · Chinese translation (1st & 2nd edition).", role: "contributor" },
  ],

  // [real, curated] selection of bin's own repositories worth highlighting
  ownRepos: [
    { name: "go-ognl",                desc: "Object-Graph Navigation Language for Go" },
    { name: "mini-compiler",          desc: "Toy compiler written from scratch" },
    { name: "mini-interpreter",       desc: "Tree-walking interpreter in Go" },
    { name: "go-Dag",                 desc: "Directed acyclic graph executor" },
    { name: "singleflight_cache",     desc: "Cache w/ singleflight de-duplication" },
    { name: "stateful_service_pools", desc: "Stateful service pool primitives" },
  ],

  // [real] organizations bin belongs to
  orgs: [
    { handle: "mosn",                              name: "MOSN",            note: "Service mesh data plane" },
    { handle: "go-kratos",                         name: "Kratos",          note: "Go microservices framework" },
    { handle: "flipped-aurora",                    name: "Flipped-Aurora",  note: "gin-vue-admin team" },
    { handle: "arana-db",                          name: "Arana-DB",        note: "Database mesh proxy" },
    { handle: "JSREI",                             name: "JS Reverse Eng. Inst.", note: "JS reverse-engineering" },
    { handle: "golang-infrastructure",             name: "Go Infra",        note: "Go infra libraries" },
    { handle: "compression-algorithm-research-lab",name: "Compression Lab", note: "Compression research" },
    { handle: "cryptography-research-lab",         name: "Crypto Lab",      note: "Cryptography research" },
    { handle: "storage-lock",                      name: "Storage-Lock",    note: "Distributed lock impls" },
  ],

  // [real] GitHub achievements (you have to count them manually — no public API)
  achievements: [
    { code: "PR-SHARK",     count: 4, label: "Pull Shark"          },
    { code: "PAIR-X",       count: 3, label: "Pair Extraordinaire" },
    { code: "STARSTRUCK",   count: 2, label: "Starstruck"          },
    { code: "YOLO",         count: 1, label: "YOLO"                },
    { code: "QUICKDRAW",    count: 1, label: "Quickdraw"           },
    { code: "ARCTIC-VAULT", count: 1, label: "Arctic Code Vault"   },
  ],

  // [curated] self-rated tech stack (1-5). Bias / opinion belongs here.
  tech: [
    { k: "primary",        v: ["Go 1.22+ (generics, runtime, unsafe)"],                                              level: 5 },
    { k: "secondary",      v: ["Rust", "Python", "Java", "TypeScript", "C"],                                         level: 3 },
    { k: "microservices",  v: ["go-kratos", "gin", "go-kit", "MOSN (sidecar)", "service-mesh patterns"],             level: 5 },
    { k: "observability",  v: ["pprof", "holmes (auto-dump)", "OpenTelemetry", "Prometheus", "trace propagation"],   level: 5 },
    { k: "concurrency",    v: ["singleflight", "errgroup", "worker pools", "DAG schedulers", "back-pressure"],       level: 5 },
    { k: "datastores",     v: ["MySQL", "PostgreSQL", "Redis", "Kafka", "etcd", "ClickHouse"],                       level: 4 },
    { k: "language-tools", v: ["mini-compiler", "mini-interpreter", "go-ognl (expr eval)", "Pratt parsing"],         level: 4 },
    { k: "infra",          v: ["gRPC", "Protobuf", "Kubernetes", "Docker", "Istio"],                                 level: 4 },
    { k: "research",       v: ["JS reverse-engineering (JSREI)", "compression algorithms", "applied cryptography"],  level: 3 },
    { k: "frontend",       v: ["Vue 3 + Vite (gin-vue-admin)"],                                                      level: 2 },
  ],

  // [curated] thematic "signature areas" pulled from bin's actual work
  signatures: [
    { tag: "service-mesh",     note: "MOSN sidecar internals, traffic governance, multi-tenant routing" },
    { tag: "auto-profiling",   note: "holmes — self-aware Go runtime dumps on threshold breach" },
    { tag: "generic toolkits", note: "gkit / go-baseutils — basic blocks for Go 1.18+ generics" },
    { tag: "compiler theory",  note: "hand-rolled lexer, Pratt parser, tree-walking interpreter" },
    { tag: "dist. primitives", note: "DAG executors, singleflight caches, stateful pools, storage locks" },
  ],

  // [fallback] public REST replaces this with recent commits from push events
  // when the unauthenticated GitHub rate limit allows it.
  commits: [
    { repo: "songzhibin97/gkit",                hash: "a4f9c12", tag: "feat", scope: "metrics",   msg: "add prometheus collector with custom labels",        time: "2h"  },
    { repo: "go-kratos/kratos",                 hash: "ec2b8af", tag: "fix",  scope: "transport", msg: "propagate context cancellation across grpc chain",   time: "9h"  },
    { repo: "songzhibin97/go-baseutils",        hash: "771e0d3", tag: "feat", scope: "set",       msg: "generic ordered set with O(log n) iteration",        time: "1d"  },
    { repo: "mosn/holmes",                      hash: "3b1a55c", tag: "perf", scope: "dump",      msg: "reduce allocations in goroutine dump path",          time: "2d"  },
    { repo: "songzhibin97/singleflight_cache",  hash: "ddef401", tag: "ref",  scope: "core",      msg: "split key hashing from eviction policy",             time: "3d"  },
    { repo: "songzhibin97/go-ognl",             hash: "92ac7b5", tag: "feat", scope: "lexer",     msg: "support slice indexing with negative index",         time: "4d"  },
    { repo: "songzhibin97/mini-compiler",       hash: "5e6f110", tag: "feat", scope: "parser",    msg: "pratt-style precedence climbing for binary ops",     time: "6d"  },
    { repo: "songzhibin97/stateful_service_pools", hash: "8c4d2e1", tag: "fix", scope: "drain",   msg: "graceful drain on SIGTERM with bounded timeout",     time: "1w"  },
    { repo: "songzhibin97/go-Dag",              hash: "1147bba", tag: "feat", scope: "exec",      msg: "topological executor with worker-pool back-pressure",time: "2w"  },
    { repo: "go-kratos/kratos",                 hash: "f02e1cd", tag: "docs", scope: "examples",  msg: "add otel + jaeger end-to-end example",               time: "3w"  },
  ],

  // [real, manual] terminal session details that show up in the MOTD / boot
  shellEnv: {
    unixUser: "bin",           // matches the `bin@arch:~$` prompt
    kernel:   "6.6.10-arch1-1",
    shell:    "zsh 5.9",
    tmux:     "3.4",
    distro:   "Arch Linux",
    goVer:    "go1.22.4",
    timezone: "XI'AN · UTC+8",
  },
};
