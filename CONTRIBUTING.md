# Contributing to AI-Sales-Agent

Thanks for your interest in **AI-Sales-Agent**!  

This project builds an intelligent, autonomous AI sales agent that handles customer conversations, product recommendations, bookings, payments, and more — powered by LLMs and agent frameworks to automate real-world sales outreach and support.

We welcome contributions of all kinds: bug fixes, new features, better prompts, integrations, docs, evaluations, or even UI improvements. Every solid PR helps make sales automation more reliable, ethical, and effective.

## Community Standards & Code of Conduct

We aim for a focused, no-nonsense community centered on building practical AI sales tools. Respect, directness, and good-faith collaboration are required.

**By participating (issues, PRs, discussions, code), you agree to:**

- Stay on-topic: Keep discussions tied to improving the agent, code, prompts, performance, or docs.
- Be constructive: Critique ideas/code, not people. Assume good intent.
- Use clear, professional language — no harassment, slurs, personal attacks, spam, or unrelated political/religious debates.
- Disclose AI usage: If you used AI tools (Copilot, Claude, GPT, etc.) to generate code/prompts/docs in your contribution, mention it briefly in the PR description (e.g., "Used Claude 3.5 for initial prompt draft → manually refined and tested").
- Respect privacy/security: Never share real customer data, API keys, or sensitive info in issues/PRs.

**Unacceptable behavior** (will lead to warnings, blocks, or bans):
- Trolling, baiting, or derailing technical threads.
- Harassment, doxxing threats, or unwelcome advances.
- Submitting untested/spammy PRs or malicious code.

Report issues privately to the maintainer(s) — open an issue with a "CoC report" label or contact via preferred method.

We follow the spirit of the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct.md), adapted for builders focused on real-world AI utility.

## How to Contribute

### 1. Reporting Bugs or Asking Questions
- Use the **Bug report** or **Question** issue template.
- Include:
  - Exact steps to reproduce (with sample conversation/transcript if possible)
  - Expected vs. actual behavior
  - LLM model/provider used (e.g., GPT-4o, Claude 3.5, Gemini 1.5)
  - Relevant config/prompt files or code snippets
  - Logs, screenshots, or error traces
  - Environment: Python version, dependencies (`pip freeze`), OS
- Search existing issues first — label duplicates as such.

### 2. Suggesting Features / Improvements
- Open a **Feature request** issue or **Idea** discussion.
- Describe:
  - The sales pain point / use case
  - Proposed solution (new tool, better prompt, integration, etc.)
  - Any alternatives considered
  - Rough pseudocode, prompt examples, or flow diagram if helpful
- Bonus: Prototype it in a draft PR!

Common welcome areas:
- Better hallucination control / grounding
- New integrations (CRM, calendars, payment providers)
- Multi-channel support (email, SMS, voice)
- Evaluation benchmarks / metrics for sales performance
- Prompt engineering improvements

### 3. Code, Prompts, or Docs Contributions

#### Quick Setup
```bash
# Fork & clone
git clone https://github.com/YOUR-USERNAME/AI-Sales-Agent.git
cd AI-Sales-Agent

# Install deps (adjust based on your setup — e.g. poetry/pipenv/uv)
pip install -r requirements.txt
# or poetry install

# Run tests / dev
pytest
# or python -m your_agent_module --dev
