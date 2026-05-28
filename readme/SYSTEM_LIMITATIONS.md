# M.I.R.A. System & Hardware Limitations Report

This document serves as a permanent record of the technical and physical constraints under which M.I.R.A. operates. These limitations should guide all future architectural decisions to ensure the application remains performant and immersive.

---

## 🛠️ 1. Hardware Constraints (The Physical Ceiling)

The application is designed to be local-first, meaning it is heavily dependent on the user's local hardware. The primary bottleneck is the transition from GPU-accelerated inference to **CPU-only inference**.

### A. Compute & Latency (CPU-Only Scenario)
When running on a CPU-only system (e.g., Violet Lotus 12B Q4), the following constraints apply:
*   **High TTFT (Time to First Token):** Prompt processing (prefill) is computationally expensive on CPUs. Larger prompts (rich lore, long histories) lead to a significant "dead air" gap before the AI begins responding.
*   **Low TPS (Tokens Per Second):** Generation speed is drastically lower than on GPUs. High-quality, long-form responses can feel slow, potentially breaking the "flow state" of roleplay.
*   **L3 Cache & Memory Bandwidth:** CPU inference is limited by the speed at which data can move from System RAM to the CPU. This makes prompt efficiency critical.

### B. Memory (RAM/VRAM)
*   **Model Footprint:** A 12B Q4 model occupies roughly 7–9 GB of RAM. 
*   **KV Cache Tax:** The "memory" of the current conversation (KV Cache) consumes additional RAM. As the context window fills, RAM usage increases.
*   **System Overhead:** With a total of 20GB RAM, there is sufficient headroom for the model and OS, but adding large, unoptimized datasets into the application's memory can lead to system swap/paging, causing UI lag.

---

## 🧠 2. Cognitive Constraints (The Intelligence Ceiling)

Regardless of hardware, the application is bound by the inherent limits of Large Language Models (LLMs).

*   **The Context Window Limit:** Every model has a hard limit on the number of tokens it can process. Once this limit is reached, the AI "forgets" the earliest parts of the conversation.
*   **The "Lore Budget" Conflict:** There is a direct trade-off between **Lore Depth** (how much world info is injected) and **Conversation Memory** (how much of the recent chat is kept). Increasing one inevitably shrinks the other.
*   **Flat Memory Structure:** The AI does not have a "subconscious" or a persistent long-term memory. It only knows what is explicitly provided in the current prompt. If a detail is not in the prompt, it does not exist for the AI.

---

## 🏗️ 3. Architectural Constraints (The Software Ceiling)

The current software design contains specific bottlenecks that may hinder scaling.

*   **Load-All State Management:** The application currently loads all stories, characters, and worlds into a JavaScript cache at startup. 
    *   *Risk:* As the user's library grows (hundreds of stories/characters), boot times will increase and RAM consumption will rise.
*   **JSON-in-RAM Processing:** Data is handled as large JS objects. Searching or filtering through massive datasets is done linearly (O(n)), which can lead to UI micro-stutters on lower-end hardware.
*   **Database Write-Through Cache:** While SQLite is used for persistence, the app relies on a write-through cache. Frequent updates (like streaming chat) can create high I/O churn if not properly debounced.

---

## 🌐 4. Platform-Specific Constraints

### A. Browser (LocalStorage)
*   **Synchronous Blocking:** `localStorage.setItem` is a blocking operation. In high-frequency scenarios (streaming), this causes "UI Jank" where the interface stutters.
*   **Storage Limits:** Browser storage is significantly more limited in size compared to a local SQLite database.

### B. Native (Tauri/SQLite)
*   **IPC Overhead:** Communication between the React frontend and the Rust backend (via Tauri) introduces a small amount of latency, though it is negligible compared to LLM inference time.

---

## 🚀 Implications for Future Development

To maintain a high-quality Roleplay experience under these constraints, the following principles must be followed:

1.  **Precision $\gg$ Volume:** Prioritize "Surgical Injection" of lore. Only inject what is absolutely necessary for the current scene to keep TTFT low.
2.  **Lazy Loading:** Move toward a system that loads only the active story and its dependencies into RAM.
3.  **Prompt Compactness:** Use concise labels and optimized formatting in system prompts to save tokens and reduce compute time.
4.  **UI/UX "Flow" Focus:** Since AI responses are slow on CPUs, the UI must provide clear feedback (loading states, token counters) to manage user expectations and maintain immersion.
