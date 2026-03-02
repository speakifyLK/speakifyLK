# Contributing to SpeakifyLK

Thank you for contributing to SpeakifyLK! This guide will help you understand our development workflow and best practices.

## 🎯 Quick Start

### 1. Pick a Task from Jira
- Visit: https://speakifylk.atlassian.net
- Find your assigned task (e.g., SPEAKIFY-1)
- Move it to "In Progress"

### 2. Create a Branch
Follow the naming convention: `<your-name>/<description>`

```bash
git checkout main
git pull origin main
git checkout -b yourname/feature-description
```

**Examples:**
- `itzzjb/user-authentication`
- `itzzjb/fix-login-bug`
- `itzzjb/update-readme`

### 3. Write Code
Make your changes following our coding standards.

### 4. Commit with Jira Reference
**IMPORTANT:** Always include the Jira issue key in your commit message.

```bash
git commit -m "SPEAKIFY-1: Add user authentication feature"
```

**Format:**
- `SPEAKIFY-XXX: <description>` - Standard format
- `SPEAKIFY-XXX: <type>: <description>` - With type prefix

**Examples:**
```bash
git commit -m "SPEAKIFY-123: Implement login API endpoint"
git commit -m "SPEAKIFY-456: Fix authentication bug"
git commit -m "SPEAKIFY-789: Update README documentation"
```

### 5. Push Your Branch
```bash
git push -u origin yourname/feature-description
```

### 6. Create Pull Request
**PR Title Format (choose one):**
- `SPEAKIFY-XXX: Description` (Recommended)
- `feat(scope): description` (Conventional commits)
- `fix: description`

**Examples:**
- ✅ `SPEAKIFY-1: Add user authentication`
- ✅ `feat(auth): implement JWT authentication`
- ✅ `fix(login): resolve session timeout issue`
- ❌ `Added new feature` (Missing Jira reference)

**PR Description:**
Fill out the template, including:
- Description of changes
- Type of change
- **Jira Reference** (SPEAKIFY-XXX)
- Related GitHub issue (if applicable)

```markdown
## Jira Reference
**Jira Issue:** SPEAKIFY-1
**Link:** https://speakifylk.atlassian.net/browse/SPEAKIFY-1

## Related Issues
Fixes #252
```

---

## 🔄 Jira-GitHub Integration

Our repository is integrated with Jira to provide automatic tracking and visibility.

### What Happens Automatically:

1. **Commits with Jira Keys:**
   - Show up in Jira Development panel
   - Link to the Jira issue automatically
   - Provide full traceability

2. **Pull Requests:**
   - Automatically linked to Jira issues
   - Bot adds Jira links to PR
   - Status updates reflect in Jira

3. **PR Labels:**
   - `jira-linked` label added automatically
   - Helps filter PRs by Jira status

### Validation Checks:

Our CI/CD pipeline validates:
- ✅ PR title format (Jira key or conventional commits)
- ✅ Jira reference in title or description
- ✅ Issue linkage (Fixes #123)
- ✅ Commit messages (warns if no Jira reference)

---

## 📝 Best Practices

### Commit Messages

**Good:**
```bash
SPEAKIFY-123: Add user registration endpoint
SPEAKIFY-456: Fix bug in login validation
SPEAKIFY-789: Update API documentation
```

**Bad:**
```bash
Fixed bug                    # No Jira reference
WIP                          # Not descriptive
Update code                  # Too vague
asdfasdf                     # Unprofessional
```

### Branch Names

**Good:**
```
itzzjb/user-authentication
itzzjb/fix-payment-bug
itzzjb/update-readme
```

**Bad:**
```
feature                      # Too vague
my-branch                    # Not descriptive
temp                         # Unclear purpose
```

### Pull Requests

**Before Creating PR:**
- [ ] Code is tested and working
- [ ] Jira issue key in title or description
- [ ] GitHub issue linked (if exists)
- [ ] No merge conflicts
- [ ] Follows coding standards

**PR Checklist:**
- [ ] Title follows format (MEDEASE-XXX or conventional)
- [ ] Description filled out completely
- [ ] Jira reference included
- [ ] Type of change selected
- [ ] Self-review completed

---

## 🚀 Smart Commits (Advanced)

Use Jira smart commits to take actions directly from GitHub:

### Add Comment to Jira:
```bash
git commit -m "SPEAKIFY-123 #comment Fixed the authentication issue"
```

### Log Work Time:
```bash
git commit -m "SPEAKIFY-123 #time 2h 30m Implementing auth logic"
```

### Close Jira Issue:
```bash
git commit -m "SPEAKIFY-123 #close Completed user authentication"
```

### Combine Multiple Actions:
```bash
git commit -m "SPEAKIFY-123 #comment Finished testing #time 1h #close"
```

---

## 🎨 Code Style

### General Guidelines
- Write clean, readable code
- Follow language-specific conventions
- Add comments for complex logic
- Keep functions small and focused

### File Organization
- Keep related files together
- Use clear, descriptive names
- Maintain consistent structure

---

## 🧪 Testing

### Before Pushing:
1. Test your changes locally
2. Run existing tests
3. Add new tests for new features
4. Ensure all tests pass

### Test Checklist:
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Edge cases considered

---

## 🔍 Code Review

### As Author:
- Keep PRs focused and small
- Respond to feedback promptly
- Update PR based on comments
- Resolve conversations when addressed

### As Reviewer:
- Be constructive and respectful
- Test the changes locally
- Check for security issues
- Verify Jira integration

---

## 🛠️ Troubleshooting

### PR Validation Failed?

**Issue:** "PR title must follow conventional commit format"
- **Fix:** Add Jira key: `SPEAKIFY-123: Your description`

**Issue:** "PR must reference a Jira issue"
- **Fix:** Add Jira reference in PR description:
  ```markdown
  **Jira Issue:** SPEAKIFY-123
  ```

**Issue:** "PR description must link to an issue"
- **Fix:** Add `Fixes #123` in description

### Commits Missing Jira Reference?

You'll get a warning comment. While not blocking, it's best practice to include Jira keys.

**To fix:**
```bash
# Amend last commit
git commit --amend -m "SPEAKIFY-123: Your description"
git push --force-with-lease
```

---

## 📚 Resources

### Documentation
- **Jira Board:** https://speakifylk.atlassian.net
- **GitHub Repo:** https://github.com/speakifyLK/speakifyLK
- **Conventional Commits:** https://www.conventionalcommits.org/

### Need Help?
- Ask in team chat
- Comment on Jira issue
- Tag reviewers in PR
- Check existing PRs for examples

---

## 🎯 Workflow Summary

```
1. Pick Jira task → SPEAKIFY-1
2. Create branch → yourname/feature-name
3. Write code
4. Commit → "SPEAKIFY-1: Description"
5. Push → git push
6. Create PR → Title: "SPEAKIFY-1: Description"
7. Fill template → Include Jira reference
8. Wait for review
9. Address feedback
10. Merge!
11. Jira updates automatically ✅
```

---

## ✅ Checklist Template

Copy this for each task:

```markdown
- [ ] Jira task moved to "In Progress"
- [ ] Branch created with proper name
- [ ] Code written and tested
- [ ] Commits include Jira reference
- [ ] PR created with Jira key in title
- [ ] PR template filled completely
- [ ] All CI checks pass
- [ ] Code reviewed and approved
- [ ] PR merged
- [ ] Branch deleted
- [ ] Jira task moved to "Done"
```

---

**Happy Coding! 🚀**

For questions or suggestions about this guide, create an issue or contact the team lead.
