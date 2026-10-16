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
| 6 | **Stories** | Image/video/text stories, clean caption authoring, center-fit vs vertical-crop toggle, full viewer with progress timers, reactions, replies, 24-hour expiration |
| 7 | **Reels / Short Videos** | Upload, vertical feed, likes, comments, shares, reposts, bookmarks, views, captions, hashtags, music/audio, recommended reels |
| 8 | **Explore** | Trending posts/reels, popular users, popular hashtags, visual content grid, personalized recommendations |
| 9 | **Trending** | Trending hashtags/posts/reels/topics, ranked by engagement + engagement growth + recency + views + shares |
| 10 | **Hashtags** | Create, follow, hashtag pages, trending hashtags, posts by hashtag, search hashtags |
| 11 | **Search** | *Now:* users, posts, reels, hashtags · *Later:* full-text search, semantic search |
| 12 | **Messaging & Studio** | *1-to-1:* text, images, video, GIFs, stickers, voice messages, replies, reactions, text/caption message editing, soft-deletion bubble handling, typing indicator, online status, read receipts<br/>*Media Upload Studio:* Interactive preview before upload with Crop & Rotate (1:1, 4:5, 16:9, Free), Paint & Doodle (multi-color palette, brush sizes, eraser, undo), and editable attached captions with emoji picker<br/>*Voice Engine:* Studio-grade recorder with live Web Audio API frequency visualizer bars & pause/resume; fluid 60/120 FPS continuous liquid waveform playback with gliding sub-pixel scrubber needle<br/>*Group (WhatsApp-style):* create, add/remove members, name/image, admins, roles, media sharing, reactions, mentions, message search, settings, leave<br/>*Global:* public real-time chatroom, online count, reactions, replies, mentions, rate limiting, spam detection, content filtering, reporting, block/mute, moderation — built with WebSockets + Redis Pub/Sub + PostgreSQL |
| 13 | **Notifications** | Likes, comments, replies, follows, mentions, reposts, shares, messages, group invitations, story reactions — delivered in real time via WebSockets |
| 14 | **Bookmarks** | Save posts and reels into custom user-created folders with color tags, folder filtering, and instant organization |
| 15 | **Reactions** | Love, Funny, Fire, Wow, Sad, Dead, Applause — applicable to posts, comments, messages, and reels |
| 16 | **Polls** | Can be created in posts, stories, and group chats |
| 17 | **Fun Features** | **Surprise Me** — randomly discover a post, user, reel, or topic for a natural rabbit-hole browsing experience |
| 18 | **AI Features** | **Recommendations** (activity → interests → ranking → personalized feed) · **Moderation** (spam, toxic-content, NSFW, suspicious-account detection) · **Meme Generator** (upload → AI captions → select → post) · **Search** (semantic queries, e.g. "show me funny programming memes") |

## Implementation Status

> **Overall Progress: ~80% (Core Platform, Stories, Reels, Custom Folders, Media Studio & High-Fidelity Messaging Active)**

| Sl No | Feature | Status | What's Implemented | What's Pending |
|:---:|---|:---:|---|---|
| 1 | **Authentication** | 🟢 ~85% | Register, Login, Logout, JWT auth via HTTP-only cookies, dynamic Google OAuth, zero credential leakage | Forgot/reset password, email verification, account deletion |
| 2 | **User Profiles** | 🟢 ~80% | Profile views, custom banner & avatar image file upload (canvas-optimized), bio, follower counts, follow/unfollow toggle | Block/unblock, mute/unmute, user profile tabs (reels/media filters) |
| 3 | **Settings & Preferences** | 🟢 ~85% | Dedicated `/settings` hub with nested router outlets (`EditProfile`, `AccountSettings`, `NotificationSettings`, `PrivacySettings`), sticky minimalist menu | Password change form, account deletion request flow |
| 4 | **Home Feed** | 🟡 ~60% | Post stream with real-time WebSocket updates, multi-image, video, polls, interactions | "Following" vs "For You" toggle tabs, reposts, clickable hashtag/mention parsing |
| 5 | **Posts** | 🟡 ~65% | Text, multi-image, video, poll creation, like, comment, bookmark, delete, share link | Edit post, pin post, report post, GIF picker, quote posts / reposts |
| 6 | **Comments** | 🟢 ~85% | Add/delete/like comments, live counts, recursive infinite nested threaded replies (`parentId`) with collapsible threads | Edit comments, user mentions |
| 7 | **Stories** | 🟢 ~90% | Backend entity, routes & uploads, full story viewer modal with timed progress bars, pause/resume, looping, center-fit vs vertical-crop toggle, clean creation flow (no default placeholder captions) | Music/audio picker, stickers, polls in stories |
| 8 | **Reels / Short Videos** | 🟢 ~85% | Backend model & upload routes, full-screen vertical feed, video player, likes, comments, bookmarking with custom folders, contain/cover display modes, saved reels grid | Duets / remixes, advanced video editor filters |
| 9 | **Explore** | ⚪ 0% | — | Visual grid, trending content discovery page |
| 10 | **Trending** | ⚪ 0% | — | Trending ranking engine (engagement + velocity + recency) |
| 11 | **Hashtags** | 🔴 ~10% | Hashtags can be typed into posts | Hashtag parsing/indexing, hashtag pages, follow hashtags, search hashtags |
| 12 | **Search** | 🟡 ~35% | Real-time user search by username/display name | Search posts, reels, hashtags, and media |
| 13 | **Messaging & Studio** | 🟢 ~98% | Real-time 1-to-1 direct messaging, group chat management, public Global Chatroom, **Media Upload Preview Studio** (Crop & Rotate with multiple aspect ratios, Paint & Doodle canvas with color palette selector & brush sizing, editable captions with emoji picker), **Voice Engine** (studio-grade Web Audio API real-time frequency visualizer bars, pause/resume, continuous 60/120 FPS liquid wave playback with gliding micro-scrubber needle), clean deleted message & voice note fallbacks, message editing restricted to text/captions, emoji reactions | Voice/video calls |
| 14 | **Notifications** | 🔴 ~15% | Frontend UI layout (`Notifications.tsx`) with mock data | Backend entity, DB persistence, real-time socket triggers on interactions |
| 15 | **Bookmarks** | 🟢 ~95% | Save/unsave posts and reels, custom user-created folders with color tags, folder filtering tabs, inline folder creation in picker modal, move items between folders, clean modern UI without emoji clutter | Shared/collaborative folders |
| 16 | **Reactions** | 🔴 ~20% | Binary like/heart on posts & comments | Rich emoji reactions (Love, Funny, Fire, Wow, Sad, Dead, Applause) |
| 17 | **Polls** | 🟡 ~60% | Poll posts with voting, percentages, single-vote prevention | Polls inside stories and group chats |
| 18 | **Fun Features** | ⚪ 0% | — | "Surprise Me" random discovery button & route |
| 19 | **AI Features** | ⚪ 0% | — | Smart recommendation engine, moderation, AI meme generator |