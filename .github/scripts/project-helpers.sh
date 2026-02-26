#!/bin/bash
# =============================================================================
# GitHub Projects V2 Helper Functions
# =============================================================================
# Shared helper functions for managing GitHub Projects V2 via GraphQL API.
#
# Required environment variables:
#   GH_TOKEN        - GitHub token with project read/write permissions
#   PROJECT_OWNER   - Owner of the project (GitHub username or org name)
#   PROJECT_NUMBER  - Project number (from the project URL)
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Project Data (cached via temp file to survive subshells)
# ---------------------------------------------------------------------------
_PROJECT_CACHE_FILE="${TMPDIR:-/tmp}/.gh-project-cache-$$"

fetch_project_data() {
  # Return from file cache if it exists (survives subshells unlike variables)
  if [ -f "$_PROJECT_CACHE_FILE" ]; then
    cat "$_PROJECT_CACHE_FILE"
    return 0
  fi

  local result project_data

  # Try as organization project first
  result=$(gh api graphql -f query='
    query($owner: String!, $number: Int!) {
      organization(login: $owner) {
        projectV2(number: $number) {
          id
          field(name: "Status") {
            ... on ProjectV2SingleSelectField {
              id
              options { id name }
            }
          }
        }
      }
    }' -f owner="$PROJECT_OWNER" -F number="$PROJECT_NUMBER" 2>/dev/null || echo '{}')

  project_data=$(echo "$result" | jq -r '.data.organization.projectV2 // empty' 2>/dev/null)

  if [ -z "$project_data" ] || [ "$project_data" = "null" ]; then
    # Fallback: try as user project
    result=$(gh api graphql -f query='
      query($owner: String!, $number: Int!) {
        user(login: $owner) {
          projectV2(number: $number) {
            id
            field(name: "Status") {
              ... on ProjectV2SingleSelectField {
                id
                options { id name }
              }
            }
          }
        }
      }' -f owner="$PROJECT_OWNER" -F number="$PROJECT_NUMBER")

    project_data=$(echo "$result" | jq -r '.data.user.projectV2')
  fi

  if [ -z "$project_data" ] || [ "$project_data" = "null" ]; then
    echo "::error::Could not find project #$PROJECT_NUMBER for owner $PROJECT_OWNER"
    return 1
  fi

  # Write to file so subshells can read it
  echo "$project_data" > "$_PROJECT_CACHE_FILE"
  echo "$project_data"
}

get_project_id() {
  fetch_project_data | jq -r '.id'
}

get_status_field_id() {
  fetch_project_data | jq -r '.field.id'
}

# Get the option ID for a given status name
# Args: $1 = status name (e.g., "Todo", "In Progress", "In Review", "Done")
get_status_option_id() {
  local status_name="$1"
  fetch_project_data | jq -r --arg name "$status_name" \
    '.field.options[] | select(.name == $name) | .id'
}

# ---------------------------------------------------------------------------
# Project Item Operations
# ---------------------------------------------------------------------------

# Add an issue or PR to the project
# Args: $1 = content node ID (issue or PR node_id)
# Returns: the new project item ID
add_to_project() {
  local content_id="$1"
  local project_id
  project_id=$(get_project_id)

  local result
  result=$(gh api graphql -f query='
    mutation($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: {
        projectId: $projectId
        contentId: $contentId
      }) {
        item { id }
      }
    }' -f projectId="$project_id" -f contentId="$content_id")

  echo "$result" | jq -r '.data.addProjectV2ItemById.item.id'
}

# Find the project item ID for a given content node ID
# Args: $1 = content node ID (issue or PR node_id)
# Returns: item ID or empty string
get_item_id_for_content() {
  local content_id="$1"
  local project_id
  project_id=$(get_project_id)

  local result
  result=$(gh api graphql -f query='
    query($id: ID!) {
      node(id: $id) {
        ... on Issue {
          projectItems(first: 50) {
            nodes { id project { id } }
          }
        }
        ... on PullRequest {
          projectItems(first: 50) {
            nodes { id project { id } }
          }
        }
      }
    }' -f id="$content_id")

  echo "$result" | jq -r --arg pid "$project_id" \
    '[.data.node.projectItems.nodes[] | select(.project.id == $pid) | .id] | first // empty'
}

# Set the status of a project item
# Args: $1 = item ID, $2 = status name
set_status() {
  local item_id="$1"
  local status_name="$2"
  local project_id field_id option_id

  project_id=$(get_project_id)
  field_id=$(get_status_field_id)
  option_id=$(get_status_option_id "$status_name")

  if [ -z "$option_id" ] || [ "$option_id" = "null" ]; then
    echo "::error::Status option '$status_name' not found in project. Available options:"
    fetch_project_data | jq -r '.field.options[].name'
    return 1
  fi

  gh api graphql -f query='
    mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $projectId
        itemId: $itemId
        fieldId: $fieldId
        value: { singleSelectOptionId: $optionId }
      }) {
        projectV2Item { id }
      }
    }' -f projectId="$project_id" \
       -f itemId="$item_id" \
       -f fieldId="$field_id" \
       -f optionId="$option_id" > /dev/null

  echo "✓ Item moved to '$status_name'"
}

# Remove an item from the project
# Args: $1 = item ID
remove_item() {
  local item_id="$1"
  local project_id
  project_id=$(get_project_id)

  gh api graphql -f query='
    mutation($projectId: ID!, $itemId: ID!) {
      deleteProjectV2Item(input: {
        projectId: $projectId
        itemId: $itemId
      }) {
        deletedItemId
      }
    }' -f projectId="$project_id" -f itemId="$item_id" > /dev/null

  echo "✓ Item removed from project"
}

# ---------------------------------------------------------------------------
# Compound Operations
# ---------------------------------------------------------------------------

# Add content to project and set its status
# Args: $1 = content node ID, $2 = status name
add_and_set_status() {
  local content_id="$1"
  local status_name="$2"
  local item_id

  item_id=$(add_to_project "$content_id")

  if [ -n "$item_id" ] && [ "$item_id" != "null" ]; then
    set_status "$item_id" "$status_name"
  else
    echo "::error::Failed to add item to project"
    return 1
  fi
}

# Find item in project (add if missing), then set status
# Args: $1 = content node ID, $2 = status name
ensure_status() {
  local content_id="$1"
  local status_name="$2"
  local item_id

  item_id=$(get_item_id_for_content "$content_id")

  if [ -z "$item_id" ] || [ "$item_id" = "null" ]; then
    echo "Item not in project, adding first..."
    item_id=$(add_to_project "$content_id")
  fi

  if [ -n "$item_id" ] && [ "$item_id" != "null" ]; then
    set_status "$item_id" "$status_name"
  else
    echo "::error::Could not find or add item to project"
    return 1
  fi
}

# ---------------------------------------------------------------------------
# Issue Number Extraction
# ---------------------------------------------------------------------------

# Extract issue number from a branch name
# Supported patterns:
#   42-description, issue-42, issue/42, feature/42-desc, fix/42-desc,
#   feat/42, hotfix/42-thing, 42/some-feature
# Args: $1 = branch name
extract_issue_number_from_branch() {
  local branch="$1"

  # Pattern: issue-42 or issue/42
  if [[ "$branch" =~ issue[/-]([0-9]+) ]]; then
    echo "${BASH_REMATCH[1]}"
  # Pattern: starts with number followed by separator (42-description)
  elif [[ "$branch" =~ ^([0-9]+)[/-] ]]; then
    echo "${BASH_REMATCH[1]}"
  # Pattern: prefix/number-description (feature/42-add-login)
  elif [[ "$branch" =~ [/-]([0-9]+)[/-] ]]; then
    echo "${BASH_REMATCH[1]}"
  # Pattern: prefix/number (feature/42)
  elif [[ "$branch" =~ [/-]([0-9]+)$ ]]; then
    echo "${BASH_REMATCH[1]}"
  else
    echo ""
  fi
}

# Extract issue numbers from PR body text
# Looks for: Closes #X, Fixes #X, Resolves #X (case-insensitive)
# Args: $1 = PR body text
extract_issue_numbers_from_body() {
  local body="$1"
  if [ -z "$body" ]; then
    echo ""
    return 0
  fi
  echo "$body" | grep -oiE '(close[sd]?|fix(e[sd])?|resolve[sd]?)\s+#[0-9]+' \
    | grep -oE '[0-9]+' \
    | sort -un \
    || echo ""
}

# Get linked issue numbers from a PR using all available methods
# Args: $1 = PR number, $2 = repo owner, $3 = repo name, $4 = branch name, $5 = PR body
get_linked_issue_numbers() {
  local pr_number="$1"
  local owner="$2"
  local repo="$3"
  local branch="$4"
  local body="$5"
  local issues=""

  # Method 1: GitHub's closing issue references (most reliable)
  issues=$(gh api graphql -f query='
    query($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $number) {
          closingIssuesReferences(first: 10) {
            nodes { number }
          }
        }
      }
    }' -f owner="$owner" -f repo="$repo" -F number="$pr_number" \
    --jq '.data.repository.pullRequest.closingIssuesReferences.nodes[].number' 2>/dev/null || echo "")

  # Method 2: Parse PR body for keywords
  if [ -z "$issues" ] && [ -n "$body" ]; then
    issues=$(extract_issue_numbers_from_body "$body")
  fi

  # Method 3: Extract from branch name
  if [ -z "$issues" ] && [ -n "$branch" ]; then
    local branch_issue
    branch_issue=$(extract_issue_number_from_branch "$branch")
    if [ -n "$branch_issue" ]; then
      issues="$branch_issue"
    fi
  fi

  echo "$issues"
}

# Get the node ID of an issue by number
# Args: $1 = issue number, $2 = repo owner, $3 = repo name
get_issue_node_id() {
  local issue_number="$1"
  local owner="$2"
  local repo="$3"

  gh api graphql -f query='
    query($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) {
        issue(number: $number) { id }
      }
    }' -f owner="$owner" -f repo="$repo" -F number="$issue_number" \
    --jq '.data.repository.issue.id' 2>/dev/null || echo ""
}

# Get the node ID of a pull request by number
# Args: $1 = PR number, $2 = repo owner, $3 = repo name
get_pr_node_id() {
  local pr_number="$1"
  local owner="$2"
  local repo="$3"

  gh api graphql -f query='
    query($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $number) { id }
      }
    }' -f owner="$owner" -f repo="$repo" -F number="$pr_number" \
    --jq '.data.repository.pullRequest.id' 2>/dev/null || echo ""
}
