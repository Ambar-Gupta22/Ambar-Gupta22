<div align="center">

<!-- ══════════════════════ HEADER ══════════════════════ -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=0%3A1a1b27%2C50%3A24283b%2C100%3A414868&height=210&section=header&text=Ambar%20Gupta&fontSize=64&fontColor=c0caf5&animation=fadeIn&fontAlignY=32&desc=SDE%20%40%20ICICI%20%C2%B7%20Systems%20%C2%B7%20C%2B%2B%20%C2%B7%20Distributed%20Backends&descSize=20&descAlignY=54&descAlign=50" width="100%" alt="Ambar Gupta — SDE @ ICICI" />

<a href="https://github.com/Ambar-Gupta22/corvus">
  <img src="https://readme-typing-svg.demolab.com/?font=Fira+Code&weight=600&size=22&duration=2800&pause=900&color=70A5FD&center=true&vCenter=true&width=640&lines=Software+Development+Engineer+%40+ICICI;Building+corvus+%E2%80%94+a+C%2B%2B+AI+agent+runtime;Distributed+systems+%C2%B7+MCP+%C2%B7+Low-latency;1000%2B+LeetCode+%C2%B7+1800+rating+%C2%B7+Top+8%25" alt="typing animation" />
</a>

<p>
  <a href="https://linkedin.com/in/ambar-gupta"><img src="https://img.shields.io/badge/LinkedIn-ambar--gupta-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn" /></a>
  <a href="https://leetcode.com/u/Ambar_Gupta"><img src="https://img.shields.io/badge/LeetCode-Ambar__Gupta-FFA116?style=for-the-badge&logo=leetcode&logoColor=black" alt="LeetCode" /></a>
  <a href="mailto:gvansh2211@gmail.com"><img src="https://img.shields.io/badge/Gmail-gvansh2211-EA4335?style=for-the-badge&logo=gmail&logoColor=white" alt="Gmail" /></a>
  <img src="https://komarev.com/ghpvc/?username=Ambar-Gupta22&style=for-the-badge&color=70a5fd&label=PROFILE+VIEWS" alt="profile views" />
</p>

<!-- ══════════════════════ TERMINAL (live, regenerated every 6h) ══════════════════════ -->
<a href="https://github.com/Ambar-Gupta22/corvus">
  <img src="https://raw.githubusercontent.com/Ambar-Gupta22/Ambar-Gupta22/output/terminal.svg" width="100%" alt="neofetch-style terminal card: SDE @ ICICI, building corvus" />
</a>

</div>

<!-- ══════════════════════ ABOUT ══════════════════════ -->
## 🧭 About Me

```cpp
struct Engineer {
    std::string_view name     = "Ambar Gupta";
    std::string_view role     = "Software Development Engineer @ ICICI";
    std::string_view building = "corvus — in-process AI agent runtime for C++17";
    std::array<std::string_view, 4> focus = {
        "distributed backends", "low-latency systems", "LLM agents / MCP", "fintech at scale"};
    std::string_view edu      = "B.Tech ECE, NIT Surat (SVNIT) '26";
    std::string_view dsa      = "1000+ LeetCode · 1800 contest rating · top 8% globally";

    [[nodiscard]] bool open_to(std::string_view what) const noexcept {
        return what == "systems collabs" || what == "OSS contributions" || what == "hard problems";
    }
};
```

- 💼 **SDE @ ICICI** — backend engineering for banking &amp; fintech at scale
- 🔭 Building **[corvus](https://github.com/Ambar-Gupta22/corvus)** — an offline-capable AI agent runtime for **C++17** that runs where Python can't: ROS2 nodes, game threads, drones, trading loops
- ⚙️ Distributed backends: event-driven microservices, durable queues, real-time observability — built an **8-service** fault-tolerant system from scratch
- 🧑‍💻 Previously: Full-Stack Engineering Intern @ **Dukanify** — multi-tenant SaaS edge routing, atomic billing, zero-downtime HTTPS automation
- 📫 **gvansh2211@gmail.com** — happy to talk systems, C++, or agents

<!-- ══════════════════════ FLAGSHIP ══════════════════════ -->
## 🐦‍⬛ Flagship Project — corvus

<div align="center">
  <a href="https://github.com/Ambar-Gupta22/corvus">
    <img src="https://raw.githubusercontent.com/Ambar-Gupta22/Ambar-Gupta22/output/flagship.svg" alt="corvus repository card" />
  </a>
</div>

> **An AI agent runtime for native C++ — think LangChain, but it runs where Python can't.**
> Local-first · embeddable · MCP-native.

- 🔌 **MCP-native client** — plugs into thousands of existing MCP tool servers on day one
- ⚡ **Native tool-calling + GBNF** — provider tool-use for cloud models, grammar-constrained JSON for local llama.cpp
- 🧵 **Async + streaming + cancellation** — non-blocking `runAsync()` with `CancelToken`, safe inside ROS2 nodes, game loops, and HFT paths
- ✅ **Offline, deterministic test suite** — 23 test cases / 76 assertions, 3-OS CI matrix with ASan/UBSan/TSan

```mermaid
flowchart LR
    host["Host process<br/>ROS2 node · game loop · trading engine"] -->|"runAsync() + CancelToken"| loop(("corvus<br/>agent loop"))
    loop <--> mem[("Memory")]
    loop -->|"tool-calling"| cloud["Cloud LLMs"]
    loop -->|"GBNF-constrained JSON"| local["llama.cpp (local)"]
    loop <-->|"MCP client"| mcp["MCP tool servers"]
    loop -.->|"streamed tokens"| host
```

## 🧪 More Things I've Built

| Project | What it is | Stack |
|---|---|---|
| **[social-media-microservices-backend](https://github.com/Ambar-Gupta22/social-media-microservices-backend)** | Distributed social backend — event-driven services over RabbitMQ, WebSocket messaging, containerised | Node · RabbitMQ · Redis · Docker |
| **[paylite](https://github.com/Ambar-Gupta22/paylite)** | UPI-style person-to-person payments with QR scan-and-pay | Dart · Flutter |
| **[E-Commerce](https://github.com/Ambar-Gupta22/E-Commerce)** | Full-stack store — JWT auth, Stripe payments, Redis caching, admin dashboard | MERN · Stripe · Redis |
| **[Streamify](https://github.com/Ambar-Gupta22/Streamify)** | Language-exchange platform with real-time chat and video calling | MERN · real-time video |

<!-- ══════════════════════ TECH STACK ══════════════════════ -->
## 🛠️ Tech Stack

<div align="center">

**Languages & Systems**<br/>
<img src="https://skillicons.dev/icons?i=cpp,c,ts,js,dart,cmake,linux&perline=7" alt="languages" />

**Backend & Data**<br/>
<img src="https://skillicons.dev/icons?i=nodejs,express,postgres,mongodb,redis,rabbitmq&perline=7" alt="backend" />

**Infra & Observability**<br/>
<img src="https://skillicons.dev/icons?i=docker,nginx,git,githubactions,prometheus,grafana,sentry&perline=7" alt="infra" />

**Frontend & Mobile**<br/>
<img src="https://skillicons.dev/icons?i=react,redux,tailwind,flutter&perline=7" alt="frontend" />

</div>

<!-- ══════════════════════ GITHUB ANALYTICS (self-hosted, see scripts/generate.mjs) ══════════════════════ -->
## 📊 GitHub Analytics

<div align="center">

<img height="185" src="https://raw.githubusercontent.com/Ambar-Gupta22/Ambar-Gupta22/output/stats.svg" alt="GitHub stats" />
<img height="185" src="https://raw.githubusercontent.com/Ambar-Gupta22/Ambar-Gupta22/output/languages.svg" alt="most used languages" />

<img src="https://raw.githubusercontent.com/Ambar-Gupta22/Ambar-Gupta22/output/heatmap.svg" width="100%" alt="contribution heatmap" />

<img src="https://raw.githubusercontent.com/Ambar-Gupta22/Ambar-Gupta22/output/activity.svg" width="100%" alt="contribution activity graph" />

<sub>⚙️ All cards are generated by <a href="scripts/generate.mjs">my own zero-dependency script</a> from the GitHub GraphQL API and refreshed every 6 hours by <a href=".github/workflows/profile.yml">GitHub Actions</a> — no third-party stats servers.</sub>

</div>

<!-- ══════════════════════ LEETCODE ══════════════════════ -->
## 🧠 Problem Solving

<div align="center">

<a href="https://leetcode.com/u/Ambar_Gupta">
  <img src="https://leetcard.jacoblin.cool/Ambar_Gupta?theme=dark&font=Fira%20Code&ext=contest" alt="LeetCode stats" />
</a>

<br/><br/>

<img src="https://img.shields.io/badge/Problems_Solved-1000%2B-70a5fd?style=for-the-badge&logo=leetcode&logoColor=white&labelColor=1a1b27" alt="problems solved" />
<img src="https://img.shields.io/badge/Contest_Rating-1800-bf91f3?style=for-the-badge&labelColor=1a1b27" alt="contest rating" />
<img src="https://img.shields.io/badge/Global_Ranking-Top_8%25-38bdae?style=for-the-badge&labelColor=1a1b27" alt="global ranking" />
<img src="https://img.shields.io/badge/Max_Streak-145_days-ff9e64?style=for-the-badge&labelColor=1a1b27" alt="max streak" />

</div>

<!-- ══════════════════════ SNAKE ══════════════════════ -->
<div align="center">
<br/>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Ambar-Gupta22/Ambar-Gupta22/output/github-snake-dark.svg" />
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/Ambar-Gupta22/Ambar-Gupta22/output/github-snake.svg" />
  <img src="https://raw.githubusercontent.com/Ambar-Gupta22/Ambar-Gupta22/output/github-snake-dark.svg" alt="contribution snake" width="100%" />
</picture>

<img src="https://capsule-render.vercel.app/api?type=waving&color=0%3A1a1b27%2C50%3A24283b%2C100%3A414868&height=120&section=footer&animation=twinkling" width="100%" alt="footer" />

</div>
