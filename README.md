# Threads Toolkit

Languages: [English](README.md) | [中文](README.zh-TW.md)

A reliable Apify Actor for scraping Threads.net - Meta's text-based social media platform.

## Features

### 1. Search Posts
Search for posts by keyword on Threads.net.

```json
{
    "action": "search",
    "keyword": "artificial intelligence",
    "filter": "recent",
    "maxItems": 100
}
```

### 2. Hashtag Search
Search posts by hashtag tag.

```json
{
    "action": "hashtag",
    "tag": "AI",
    "filter": "recent",
    "maxItems": 50
}
```

### 3. Profile Scraping
Fetch user profile data including bio, follower count, verification status, and recent posts on the profile page.

```json
{
    "action": "profile",
    "username": "zuck"
}
```

### 4. Single Post Extraction
Extract detailed data from a specific post by URL (includes replies on the page if available).

```json
{
    "action": "post",
    "postUrl": "https://www.threads.com/@zuck/post/ABC123xyz"
}
```

## Input Parameters

### Common Parameters

| Field | Type | Required | Description | Default |
|-------|------|----------|-------------|---------|
| `action` | string | Yes | Action type: `search`, `hashtag`, `profile`, or `post` | - |
| `proxyConfiguration` | object | No | Proxy settings for reliability | Apify Proxy |

### Search Action

| Field | Type | Required | Description | Default |
|-------|------|----------|-------------|---------|
| `keyword` | string | Yes | Search keyword | - |
| `filter` | string | No | Sort results: `recent` or `top` | `recent` |
| `maxItems` | integer | No | Maximum posts to return (1-1000) | `50` |

### Hashtag Action

| Field | Type | Required | Description | Default |
|-------|------|----------|-------------|---------|
| `tag` | string | Yes | Hashtag to search (with or without #) | - |
| `filter` | string | No | Sort results: `recent` or `top` | `recent` |
| `maxItems` | integer | No | Maximum posts to return (1-1000) | `50` |

### Profile Action

| Field | Type | Required | Description | Default |
|-------|------|----------|-------------|---------|
| `username` | string | Yes | Username to fetch (without @) | - |
| `includePosts` | boolean | No | Also scrape recent posts from the profile page | `true` |
| `maxItems` | integer | No | Max posts to fetch from profile page | `20` |

### Post Action

| Field | Type | Required | Description | Default |
|-------|------|----------|-------------|---------|
| `postUrl` | string | Yes | Full URL to the Threads post | - |
| `maxItems` | integer | No | (Batch/profile/search/hashtag) limit per query where applicable | - |

## Output Format

### Post Output (Search, Hashtag, Post actions)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique post identifier |
| `url` | string | Direct link to the post |
| `author.username` | string | Author's username |
| `author.displayName` | string | Author's display name |
| `author.profileUrl` | string | Link to author's profile |
| `author.avatarUrl` | string | Author's avatar image URL |
| `author.isVerified` | boolean | Whether the author is verified |
| `content` | string | Post text content |
| `timestamp` | string | ISO 8601 timestamp |
| `stats.likes` | integer | Number of likes |
| `stats.replies` | integer | Number of replies |
| `stats.reposts` | integer | Number of reposts |
| `images` | array | Image URLs (if any) |
| `videos` | array | Video URLs (if any) |
| `links` | array | External links (non-Threads) |
| `quotedPost` | object | Minimal quoted post info if present |
| `source` | string | Optional source tag (e.g., `reply`, `profile_posts`) |
| `parentId` | string | If source is `reply`, the parent post ID |

#### Example Post Output

```json
{
    "id": "ABC123xyz",
    "url": "https://www.threads.com/@johndoe/post/ABC123xyz",
    "author": {
        "username": "johndoe",
        "displayName": "John Doe",
        "profileUrl": "https://www.threads.com/@johndoe",
        "avatarUrl": "https://...",
        "isVerified": false
    },
    "content": "This is the post content...",
    "timestamp": "2025-12-04T10:14:34.000Z",
    "stats": {
        "likes": 142,
        "replies": 23,
        "reposts": 8
    },
    "images": [],
    "videos": []
}
```

### Profile Output

| Field | Type | Description |
|-------|------|-------------|
| `username` | string | Username |
| `displayName` | string | Display name |
| `profileUrl` | string | Profile URL |
| `avatarUrl` | string | Avatar image URL |
| `bio` | string | User bio text |
| `isVerified` | boolean | Whether the user is verified |
| `followersCount` | integer | Number of followers |
| `partial` | boolean | True if some optional fields are missing |
| `missingFields` | array | Names of missing optional fields |
| `type` | string | `"profile"` for the profile record |
| `source` | string | `"profile"` for the profile record |
| (posts) | - | Recent posts from the profile page are pushed as separate Dataset items with `source: "profile_posts"` and `profile: <username>` |
| (posts) | - | Recent posts from the profile page are pushed as separate Dataset items with `source: "profile_posts"` and `profile: <username>` |
| `profilePosts` | array | Recent posts scraped from the profile page (pushed as separate items with `source: "profile_posts"`) |

#### Example Profile Output

```json
{
    "username": "zuck",
    "displayName": "Mark Zuckerberg",
    "profileUrl": "https://www.threads.com/@zuck",
    "avatarUrl": "https://...",
    "bio": "Building the future...",
    "isVerified": true,
    "followersCount": 5417000,
    "partial": false,
    "missingFields": []
}
```

## Data Quality

- Posts: Entries missing essential data (content, author, or valid timestamp) are filtered out and not written to the Dataset.
- Profiles: If optional fields are missing (e.g., bio/avatar/followers), the record is kept but marked with `partial=true` and `missingFields`.
- Replies and profile posts reuse the same validation; invalid ones are skipped.

## Batch Mode

You can run multiple inputs in one run via batch fields. `concurrency` controls how many tasks run in parallel (default 2).

```json
{
  "action": "search",        // kept for compatibility; batch fields drive the tasks
  "keywords": ["vibe coding", "machine learning"],
  "usernames": ["zuck", "openai"],
  "tags": ["AI", "台灣"],
  "postUrls": ["https://www.threads.com/@user/post/ABC123"],
  "maxItems": 20,
  "filter": "recent",
  "concurrency": 2
}
```

Notes:
- `source: "reply"` items include `parentId` of the main post.
- `source: "profile_posts"` items include `profile: <username>`.

## Usage Notes

- This Actor uses a browser-based approach (Playwright) which is necessary for Threads.net's dynamic content
- Using Apify Proxy is recommended for better reliability
- Threads.net may rate-limit requests during high-volume scraping

## Cost Estimation

This Actor runs on Playwright (Chromium), which consumes more compute resources than HTTP-based scrapers.

Estimated costs (may vary):
- ~50 posts: approximately $0.05
- ~500 posts: approximately $0.30
- ~1000 posts: approximately $0.50
