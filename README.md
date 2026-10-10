<div align="center">

# Echolet

<img src="logo.png" width="100" height="100" alt="Echolet Logo" />

<br/>

[![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Axios](https://img.shields.io/badge/Axios-5A29E4?style=flat-square&logo=axios&logoColor=white)](https://axios-http.com/)
[![ExpressJs](https://img.shields.io/badge/express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)

</div>

### A modern social platform designed to foster meaningful connections, conversations, and community-driven interactions beyond the traditional social media feed.


## Features

| Sl No | Feature | Includes |
|---|---|---|
| 1 | **Authentication** | Register, Login, Logout, JWT auth, HTTP-only cookies, Google OAuth, Forgot/reset password, Email verification, Account deletion, Account settings |
| 2 | **User Profiles** | Username, display name, profile picture, cover image, bio, followers/following, posts, reels, tagged posts, liked posts, saved posts, follow/unfollow, block/unblock, mute/unmute |
| 3 | **Home Feed** | Following feed, For You feed, text/image/video/GIF posts, polls, reposts, hashtags, mentions, likes, comments, shares, bookmarks |    
| 4 | **Posts** | *Types:* text, image, multi-image, video, GIF, poll, link · *Actions:* like, comment, repost, share, bookmark, edit, delete, pin, report |
| 5 | **Comments** | Comments, nested replies, like/edit/delete comments, user mentions, comment notifications |
| 6 | **Stories** | Image/video/text stories, music, GIFs, stickers, polls, questions, story views, reactions, replies, 24-hour expiration |
| 7 | **Reels / Short Videos** | Upload, vertical feed, likes, comments, shares, reposts, bookmarks, views, captions, hashtags, music/audio, recommended reels |
| 8 | **Explore** | Trending posts/reels, popular users, popular hashtags, visual content grid, personalized recommendations |
| 9 | **Trending** | Trending hashtags/posts/reels/topics, ranked by engagement + engagement growth + recency + views + shares |
| 10 | **Hashtags** | Create, follow, hashtag pages, trending hashtags, posts by hashtag, search hashtags |
| 11 | **Search** | *Now:* users, posts, reels, hashtags · *Later:* full-text search, semantic search |
| 12 | **Messaging** | *1-to-1:* text, images, video, GIFs, stickers, voice messages, replies, reactions, edit/delete, typing indicator, online status, read receipts · *Group (WhatsApp-style):* create, add/remove members, name/image, admins, roles, media sharing, reactions, mentions, message search, settings, leave · *Global:* public real-time chatroom, online count, reactions, replies, mentions, rate limiting, spam detection, content filtering, reporting, block/mute, moderation — built with WebSockets + Redis Pub/Sub + PostgreSQL |
| 13 | **Notifications** | Likes, comments, replies, follows, mentions, reposts, shares, messages, group invitations, story reactions — delivered in real time via WebSockets |
| 14 | **Bookmarks** | Save posts, reels, images, videos into custom collections (e.g. Memes, Movies, Programming, Funny, Other) |
| 15 | **Reactions** | Love, Funny, Fire, Wow, Sad, Dead, Applause — applicable to posts, comments, messages, and reels |
| 16 | **Polls** | Can be created in posts, stories, and group chats |
| 17 | **Fun Features** | **Surprise Me** — randomly discover a post, user, reel, or topic for a natural rabbit-hole browsing experience |
| 18 | **AI Features** | **Recommendations** (activity → interests → ranking → personalized feed) · **Moderation** (spam, toxic-content, NSFW, suspicious-account detection) · **Meme Generator** (upload → AI captions → select → post) · **Search** (semantic queries, e.g. "show me funny programming memes") |

## Implementation Status

> **Overall Progress: ~42% (Core MVP Active)**

| Sl No | Feature | Status | What's Implemented | What's Pending |
|:---:|---|:---:|---|---|
| 1 | **Authentication** | 🟡 ~65% | Register, Login, Logout, JWT auth, HTTP-only cookies | Google OAuth, forgot/reset password, email verification, account deletion/settings |
| 2 | **User Profiles** | 🟡 ~60% | Profile views, follow/unfollow toggle, followers/following counts & lists | Edit Profile modal (avatar/bio/cover), cover photo, block/unblock, mute |
| 3 | **Home Feed** | 🟡 ~60% | Post stream with real-time WebSocket updates, multi-image, video, polls, interactions | "Following" vs "For You" toggle tabs, reposts, clickable hashtag/mention parsing |
| 4 | **Posts** | 🟡 ~65% | Text, multi-image, video, poll creation, like, comment, bookmark, delete, share link | Edit post, pin post, report post, GIF picker, quote posts / reposts |
| 5 | **Comments** | 🟡 ~60% | Add comment, delete comment, like comment, live comment counts | Nested/threaded replies (`parentId`), edit comments, user mentions |
| 6 | **Stories** | 🔴 ~10% | Frontend UI component shell (`Stories.tsx`) | Backend entity & routes, file upload, full story viewer modal, 24-hour expiration |
| 7 | **Reels / Short Videos** | ⚪ 0% | — | Vertical reel feed, video player, reels tab/page, backend model |
| 8 | **Explore** | ⚪ 0% | — | Visual grid, trending content discovery page |
| 9 | **Trending** | ⚪ 0% | — | Trending ranking engine (engagement + velocity + recency) |
| 10 | **Hashtags** | 🔴 ~10% | Hashtags can be typed into posts | Hashtag parsing/indexing, hashtag pages, follow hashtags, search hashtags |
| 11 | **Search** | 🟡 ~35% | Real-time user search by username/display name | Search posts, reels, hashtags, and media |
| 12 | **Messaging** | 🟡 ~45% | Real-time 1-to-1 direct messaging via WebSockets | Media sharing, typing indicator, online status, group chats, global chatroom |
| 13 | **Notifications** | 🔴 ~15% | Frontend UI layout (`Notifications.tsx`) with mock data | Backend entity, DB persistence, real-time socket triggers on interactions |
| 14 | **Bookmarks** | 🟡 ~55% | Save/unsave posts, saved posts feed | Custom collections/folders (Memes, Movies, Programming, etc.) |
| 15 | **Reactions** | 🔴 ~20% | Binary like/heart on posts & comments | Rich emoji reactions (Love, Funny, Fire, Wow, Sad, Dead, Applause) |
| 16 | **Polls** | 🟡 ~60% | Poll posts with voting, percentages, single-vote prevention | Polls inside stories and group chats |
| 17 | **Fun Features** | ⚪ 0% | — | "Surprise Me" random discovery button & route |
| 18 | **AI Features** | ⚪ 0% | — | Smart recommendation engine, moderation, AI meme generator |