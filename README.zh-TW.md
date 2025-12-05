# Threads Toolkit

語言： [English](README.md) | [中文](README.zh-TW.md)

一個可靠的 Apify Actor，用來爬取 Threads.net 的貼文、標籤、個人檔案與單篇貼文（含回覆）。

## 功能

- **搜尋貼文**：依關鍵字搜尋貼文。
- **標籤搜尋**：依 hashtag 搜尋貼文。
- **個人檔案**：抓取個人檔案資訊（頭像、bio、粉絲數、驗證狀態），並抓近期貼文。
- **單篇貼文**：依 URL 抓取貼文詳情，含頁面上的回覆。
- **批次模式**：一次處理多個 keyword/username/tag/postUrl，支援並行度。

## 輸入參數

### 共用
| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `action` | string | 是 | `search`、`hashtag`、`profile`、`post`（batch 仍需填 action，但實際依批次欄位執行） |
| `proxyConfiguration` | object | 否 | 代理設定，建議使用 Apify Proxy |

### Search
| 欄位 | 型別 | 必填 | 說明 | 預設 |
|------|------|------|------|------|
| `keyword` | string | 是 | 搜尋關鍵字 | - |
| `filter` | string | 否 | `recent` 或 `top` | `recent` |
| `maxItems` | integer | 否 | 最大抓取數量 | `50` |

### Hashtag
| 欄位 | 型別 | 必填 | 說明 | 預設 |
|------|------|------|------|------|
| `tag` | string | 是 | hashtag（可含 #） | - |
| `filter` | string | 否 | `recent` 或 `top` | `recent` |
| `maxItems` | integer | 否 | 最大抓取數量 | `50` |

### Profile
| 欄位 | 型別 | 必填 | 說明 | 預設 |
|------|------|------|------|------|
| `username` | string | 是 | 不含 @ 的帳號名稱 | - |
| `maxItems` | integer | 否 | 從個人頁抓貼文的上限 | `20` |

### Post
| 欄位 | 型別 | 必填 | 說明 | 預設 |
|------|------|------|------|------|
| `postUrl` | string | 是 | Threads 貼文完整 URL | - |
| `maxItems` | integer | 否 | 抓回覆的上限 | `50` |

### Batch (可選)
| 欄位 | 型別 | 必填 | 說明 | 預設 |
|------|------|------|------|------|
| `keywords` | array | 否 | 多個搜尋關鍵字 | [] |
| `usernames` | array | 否 | 多個 username | [] |
| `tags` | array | 否 | 多個 hashtag | [] |
| `postUrls` | array | 否 | 多個貼文 URL | [] |
| `maxItems` | integer | 否 | 依各任務套用的上限 | - |
| `filter` | string | 否 | `recent` 或 `top`（適用 search/hashtag） | `recent` |
| `concurrency` | integer | 否 | batch 並行度 | `2` |

## 輸出格式

### 貼文（Search/Hashtag/Post/Replies/Profile-posts）
| 欄位 | 說明 |
|------|------|
| `id` | 貼文 ID |
| `url` | 貼文連結 |
| `author.*` | 使用者名稱、顯示名稱、個人檔案連結、頭像、驗證狀態 |
| `content` | 文字內容 |
| `timestamp` | ISO 時間戳 |
| `stats.*` | 讚/回覆/轉發數 |
| `images` | 圖片 URLs |
| `videos` | 影片 URLs |
| `links` | 外部連結（非 Threads） |
| `quotedPost` | 若有引用，輸出簡版貼文資訊 |
| `source` | 可選，`reply`（回覆）、`profile_posts`（個人頁貼文） |
| `parentId` | 若為 reply，對應主貼 ID |

### 個人檔案
| 欄位 | 說明 |
|------|------|
| `username` | 帳號 |
| `displayName` | 顯示名稱 |
| `profileUrl` | 個人檔案連結 |
| `avatarUrl` | 頭像 |
| `bio` | 自介 |
| `isVerified` | 是否驗證 |
| `followersCount` | 粉絲數 |
| `partial` | 若缺少非必填欄位為 true |
| `missingFields` | 缺少的非必填欄位名稱 |
| （貼文） | 個人頁近期貼文會以 Dataset 另筆輸出，`source: "profile_posts"`、`profile: <username>` |

## 品質與驗證
- 貼文：缺少內容/作者/時間戳會被濾掉，不寫入 Dataset。
- 個人檔案：缺少非必填欄位時仍保留，但標記 `partial/missingFields`。
- 回覆與個人頁貼文沿用相同驗證，不合格會跳過。

## Batch 模式範例
```json
{
  "action": "search",
  "keywords": ["vibe coding", "machine learning"],
  "usernames": ["zuck", "openai"],
  "tags": ["AI", "台灣"],
  "postUrls": ["https://www.threads.com/@user/post/ABC123"],
  "maxItems": 20,
  "filter": "recent",
  "concurrency": 2
}
```
批次任務會依序/並行執行（並行度 `concurrency`），結束時 log 會輸出成功/失敗摘要。

## 注意事項
- 需 Playwright 瀏覽器才能取得動態內容；建議使用 Apify Proxy。
- Threads 可能有登入牆/風控，遇到時任務會記錄錯誤並跳過。
