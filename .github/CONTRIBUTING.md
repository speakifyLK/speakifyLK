# Contributing to SpeakifyLK

Thank you for contributing to SpeakifyLK! This guide covers our development workflow.

## Quick Start

### 1. Pick a Task from Jira
- Visit the [Jira Board](https://speakifylk.atlassian.net)
- Find your assigned task (e.g., SPEAKLK-4)
- Move it to "In Progress"

### 2. Create a Branch
Follow the naming convention: `<your-name>/<description>`

```bash
git checkout main
git pull origin main
git checkout -b yourname/feature-description
```

**Examples:**
- `itzzjb/gemini-client-setup`
- `itzzjb/fix-login-bug`
- `itzzjb/quiz-ui-components`

### 3. Write Code & Commit
Commit messages can be anything descriptive. No special format required.

```bash
git commit -m "Add Gemini client utility"
git commit -m "Fix quiz scoring logic"
```

### 4. Push & Open a Pull Request
```bash
git push -u origin yourname/feature-description
```

**PR Title must include the Jira key and a description:**
- `SPEAKLK-4: Create Gemini client utility`
- `SPEAKLK-12: Fix chat streaming bug`

That's it. The PR title is the **only place** you need to reference the Jira key.

### 5. Automation Takes Over

Once you open the PR, workflows handle everything:

| What happens | Automated? |
|---|---|
| PR assigned to you | Yes |
| PR title validated (Jira key format) | Yes |
| Jira reference checked | Yes |
| PR description generated (from Jira + diff) | Yes |
| `jira-linked` label added | Yes |
| Comment posted on Jira issue with PR link | Yes |

### 6. Request a Code Review
To request an AI-powered code review from GitHub Copilot, add a new comment on the PR that starts with the command `/copilot-review`.

> Note: The workflow currently triggers on any comment that contains the phrase `copilot-review`, so avoid mentioning it in other contexts unless you intend to start a review.
### 7. Team Review & Merge
Once approved, merge the PR. On merge:
- Jira issue automatically transitions to **Done**
- Branch is automatically deleted

---

## What You Need to Remember

**Only the PR title matters for Jira integration.** Use the format `SPEAKLK-XXX: description` in your PR title and everything else is automated.

| | Required? |
|---|---|
| PR title format `SPEAKLK-XXX: description` | **Yes** |
| Branch name has Jira key | No |
| Commit messages have Jira key | No |
| PR body has Jira reference | No (auto-generated) |
| Link GitHub issues | No |

---

## PR Title Format

**Valid formats:**
- `SPEAKLK-4: Create Gemini client utility`
- `SPEAKLK-12: Fix chat streaming bug`

**Invalid:**
- `Added new feature` (missing Jira key)
- `SPEAKIFYLK-4` (missing colon and description)

---

## Validation Checks

Our CI pipeline checks:
- PR title format (`SPEAKLK-XXX: description` — Jira key required)
- Jira reference exists in title

If a check fails, update your PR title to include the Jira key.

---

## Code Review

### AI Review
Comment `copilot-review` on any PR to get automated feedback from GitHub Copilot. It posts inline review comments on specific lines.

### Team Review
- Keep PRs focused and small
- Respond to feedback promptly
- Resolve conversations when addressed

---

## Workflow Summary

```
1. Pick Jira task        (SPEAKLK-4)
2. Create branch         (yourname/feature-name)
3. Write code & commit
4. Push & open PR        (Title: "SPEAKLK-4: Description")
5. Workflows auto-fill PR description + link to Jira
6. Comment "copilot-review" for AI review
7. Team reviews & approves
8. Merge PR
9. Jira auto-closes + branch auto-deleted
```

---

## Troubleshooting

**"PR title must follow the format: SPEAKLK-123: short description"**
- Fix: Add Jira key to title: `SPEAKLK-4: Your description`

**"PR must reference a Jira issue"**
- Fix: Make sure `SPEAKLK-XXX` appears in your PR title

**Jira issue didn't close after merge?**
- Check the Jira board — it may need a manual transition if "Done" isn't available

---

## Resources

- **Jira Board:** https://speakifylk.atlassian.net
- **GitHub Repo:** https://github.com/speakifyLK/speakifyLK

For questions, contact the team lead.
