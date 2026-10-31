<div align="center">

# Echolet

<img src="logo.png" width="110" height="110" alt="Echolet Logo" />

### Next-Generation Social Media, Reels & Real-Time Communication Platform

[![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript_5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite_8-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express_5-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Lenis](https://img.shields.io/badge/Lenis_Scroll-000000?style=for-the-badge&logo=scroll&logoColor=white)](https://github.com/darkroomengineering/lenis)
[![Emoji Picker](https://img.shields.io/badge/Emoji_Picker_React-FFCC4D?style=for-the-badge&logo=smile&logoColor=black)](https://github.com/ealush/emoji-picker-react)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![TypeORM](https://img.shields.io/badge/TypeORM-FE0803?style=for-the-badge&logo=typeorm&logoColor=white)](https://typeorm.io/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io_4-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)
[![WebRTC](https://img.shields.io/badge/WebRTC-333333?style=for-the-badge&logo=webrtc&logoColor=white)](https://webrtc.org/)

<br/>

**Echolet** is a high-performance, full-stack social media and real-time communication platform built to deliver seamless social networking, vertical short-form video streaming (Reels), ephemeral stories, custom collection bookmarking, and low-latency interactive communications including direct messaging, group chats, global public chatrooms, and peer-to-peer WebRTC voice calling.

</div>

---

## Table of Contents

- [System Architecture](#system-architecture)
- [Key Features & Modules](#key-features--modules)
  - [Authentication & Security](#1-authentication--security)
  - [User Profiles & Social Graph](#2-user-profiles--social-graph)
  - [Interactive Feed & Posts](#3-interactive-feed--posts)
  - [Reels & Short-Form Video](#4-reels--short-form-video)
  - [Ephemeral Stories Engine](#5-ephemeral-stories-engine)
  - [Bookmark Collections](#6-bookmark-collections)
  - [Real-Time Messaging & Chat Studio](#7-real-time-messaging--chat-studio)
  - [WebRTC P2P Voice Calling](#8-webrtc-p2p-voice-calling)
  - [Notifications & Universal Search](#9-notifications--universal-search)
  - [Cloud Media Pipeline (Supabase Storage)](#10-cloud-media-pipeline-supabase-storage)
  - [Node.js Runtime & Server Architecture](#11-nodejs-runtime--server-architecture)
  - [Lenis Kinetic Smooth Scrolling](#12-lenis-kinetic-smooth-scrolling)
  - [Emoji Picker React Integration](#13-emoji-picker-react-integration)
- [Database Schema & Data Model](#database-schema--data-model)
- [WebSockets & WebRTC Signaling](#websockets--webrtc-signaling)
- [REST API Reference](#rest-api-reference)
- [Project Directory Layout](#project-directory-layout)
- [Environment Configuration](#environment-configuration)
- [Getting Started](#getting-started)
- [Deployment Guide](#deployment-guide)

---

## System Architecture

Echolet utilizes a modern decoupled architecture combining a reactive React 19 single-page application with a scalable Express 5 / TypeORM backend, real-time bi-directional WebSockets, peer-to-peer WebRTC audio channels, and resilient cloud storage via Supabase.

```mermaid
flowchart TD
    subgraph Client ["Client Tier (React 19 + Vite + Tailwind v4)"]
        UI["Modern UI / Lenis Smooth Scroll"]
        State["Context Layer (CallContext, MessageContext)"]
        SocketClient["Socket.io Real-time Client"]
        WebRTCClient["WebRTC Native Audio API"]
        AudioEngine["Web Audio API Waveform Visualizer"]
    end

    subgraph Gateway ["Reverse Proxy and Edge Layer"]
        EdgeProxy["Vercel / Nginx / Cloudflare Edge"]
    end

    subgraph Backend ["Backend Tier (Node.js + Express 5 + TypeORM)"]
        ExpressApp["Express API and Middleware"]
        AuthMiddleware["JWT and Cookie Auth Guard"]
        UploadMulter["Multer Memory Buffer Validation"]
        SocketServer["Socket.io Server (Rooms, Presence, Signaling)"]
    end

    subgraph Persistence ["Persistence and Cloud Storage Tier"]
        Postgres[("Supabase PostgreSQL Database")]
        SupabaseStorage[("Supabase Storage CDN - echolet-media")]
    end

    UI --> State
    State --> SocketClient
    State --> WebRTCClient
    UI -->|"HTTPS REST Requests"| EdgeProxy
    EdgeProxy -->|"Reverse Proxy"| ExpressApp
    SocketClient <-->|"Bi-directional WebSocket"| SocketServer
    WebRTCClient <-->|"Direct P2P Opus Audio Stream"| RemotePeer["Remote Peer WebRTC"]
    ExpressApp --> AuthMiddleware
    ExpressApp --> UploadMulter
    UploadMulter -->|"Service-Role S3 REST Upload"| SupabaseStorage
    ExpressApp -->|"TypeORM Connection Pool"| Postgres
    SocketServer -->|"State and Message Sync"| Postgres
```

---

## Key Features & Modules

### 1. Authentication & Security
- **Dual Authentication Strategy**: Supports standard email/password registration with bcrypt salt hashing, as well as native Google OAuth 2.0.
- **Secure Token Delivery**: Uses JSON Web Tokens (JWT) stored in HTTP-only, secure, `SameSite=Lax` cookies, preventing cross-site scripting (XSS) credential theft.
- **Zero Credential Leakage**: Password hashes and sensitive internal credentials are systematically excluded from all user serialization transforms.
- **Ownership Verification**: Enforced authorization policies on resources (posts, comments, reels, messages, folders) ensuring users can only modify or delete content they own.

### 2. User Profiles & Social Graph
- **Dynamic Profiles**: Customized display names, unique `@username` identifiers, custom bios, avatar pictures, and profile cover banners.
- **Follow & Connect System**: Follow/unfollow mechanics with follower/following counts, follower removal, and pending follow request pipelines.
- **Organized Profile Feed**: Filterable views for personal posts, reels, liked media, and saved bookmarks.
- **Canvas-Optimized Uploads**: Profile and cover images are cropped and compressed before upload to minimize bandwidth.

### 3. Interactive Feed & Posts
- **Rich Post Creation**: Publish text updates, single/multiple image galleries, MP4/WebM video posts, and interactive voter polls.
- **Engaging Polls**: Poll options with real-time percentage calculations, voter anonymity or transparency logs, and single-vote protection.
- **Infinite Recursive Comments**: Hierarchical nested threaded discussions supporting replies to replies (`parentId` relation) with collapsible subtrees.
- **Real-time Interactions**: One-tap like/unlike toggling, comment reactions, direct link sharing, and bookmarking.

### 4. Reels & Short-Form Video
- **Vertical Feed Player**: Full-viewport vertical video stream with autoplay, loop, mute/unmute, and custom playback controls.
- **Mobile-First UX**: Immersive edge-to-edge layout on mobile with hidden navigation bars to avoid distractions.
- **Curved Half-Sheet Mobile Drawer**:
  - Comments on mobile pop up from the bottom as an elegant half-height drawer (`58vh`, `max-h-[72vh]`).
  - Features smooth top curved borders (`rounded-t-[32px]`), background video dimming, top drag handle pill (`w-12 h-1.5`), and safe area padding.
- **Creator Attributes**: Creator badges, pin-to-top comments, sound attribution, view counts, and share modals.

### 5. Ephemeral Stories Engine
- **24-Hour Expiration**: Automatic lifecycle management for stories, keeping the feed fresh.
- **Stories Bar**: Circular avatar ring indicators with distinct gradient styling for unread stories.
- **Interactive Story Viewer**: Fullscreen modal with auto-advancing segment timers, pause-on-hold, tap left/right navigation, and direct story replies/likes.
- **Display Modes**: Toggle between vertical-crop (`object-cover`) and center-fit (`object-contain`) display styles.

### 6. Bookmark Collections
- **Custom Categorized Folders**: Create custom folders with custom titles and color badges (Indigo, Rose, Emerald, Amber, Cyan, Purple).
- **Multi-Content Bookmarking**: Save both feed posts and video reels into designated folders.
- **Seamless Organization**: Add, move, rename, and delete collections on the fly with live folder count recalculations.

### 7. Real-Time Messaging & Chat Studio
- **Direct 1-to-1 Chat**: Real-time communication powered by WebSockets with instant delivery, typing indicators, read receipts, and online status badges.
- **Group Conversations**: WhatsApp-style group chats with customizable titles, avatars, admin privileges, member additions/removals, and role promotions.
- **Public Global Chatroom**: Real-time community lounge with active user counts, rate limiting, and community moderation tools.
- **Media Upload Studio**:
  - Interactive pre-upload preview modal.
  - Crop and rotate photos with standard aspect presets (`1:1`, `4:5`, `16:9`, free-form).
  - Canvas Paint & Doodle engine: Multi-color palette, brush size slider, eraser, and full undo history.
  - Attached media caption authoring with integrated emoji picker.
- **Studio-Grade Voice Engine**:
  - Audio recorder utilizing Web Audio API with real-time dancing frequency analyzer bars.
  - Pause and resume recording controls.
  - High-precision waveform visualizer playback at 60/120 FPS with a gliding sub-pixel scrubber needle.
- **Message Lifecycle**: In-place text editing, soft-delete tombstone display, starring, message pinning, and emoji reactions.

### 8. WebRTC P2P Voice Calling
- **Direct Voice Streaming**: High-fidelity, low-latency audio transmission via browser-native WebRTC peer connections.
- **Signaling via Socket.io**: Robust call handshakes handling `call_user`, `call_accepted`, `call_declined`, `call_busy`, and `ice_candidate` exchange.
- **Synthesized Ringtone Audio**: Web Audio API oscillator-based ringers for incoming and outgoing alerts without external audio file dependencies.
- **Minimizable Floating Pill**: Shrink active calls into a compact draggable bottom widget to continue browsing the platform while talking.
- **Call Persistence**: Automatically generates call summary logs (Duration, Status, Timestamp) in the conversation history and triggers missed call notifications for unanswered rings.

### 9. Notifications & Universal Search
- **Instant Activity Alerts**: Real-time notifications for likes, comments, replies, follow events, and missed voice calls.
- **Unread Counters**: Live badges across desktop sidebars and mobile navigation bars.
- **Omni-Search Engine**: Search across usernames, display names, post captions, reel titles, and tags with debounced querying.

### 10. Cloud Media Pipeline (Supabase Storage)
- **Centralized Bucket (`echolet-media`)**: Secure, high-throughput cloud storage handling all media formats (images, videos, audio notes).
- **Categorized Key Namespace**:
  - `avatars/{userId}/{filename}` — User profile avatars
  - `banners/{userId}/{filename}` — Profile cover banners
  - `posts/{userId}/{filename}` — Multi-image post media
  - `reels/{userId}/{filename}` — Short video reels
  - `stories/{userId}/{filename}` — Ephemeral story content
  - `chat/{userId}/{filename}` — Chat attachments and voice recordings
- **Security & Ownership**: Uploads stream through backend memory buffers where file type, payload sizes (up to 125MB), and user credentials are validated before persisting to Supabase via secret backend service role keys.

### 11. Node.js Runtime & Server Architecture
- **High-Throughput Asynchronous Core**: Built on the Node.js (>=18) V8 runtime utilizing non-blocking asynchronous event loops to process thousands of concurrent WebSocket messages and REST requests.
- **Express 5 Engine**: Leverages modern Express 5 with native Promise-based route handlers, robust global error boundaries, and strict CORS configuration for cross-origin security.
- **Streaming In-Memory Buffers**: Handles high-performance media uploads with Multer in-memory buffers up to 125MB per file, bypassing disk writes on serverless environments (e.g. Vercel) and piping streams directly to Supabase cloud storage.
- **Cryptographic Security**: Enforces salt-hashed passwords using `bcryptjs` and signs cryptographically secure JWT authentication tokens with timed expiration (`7d`).

### 12. Lenis Kinetic Smooth Scrolling
- **Fluid Viewport Dynamics**: Integrated `@studio-freight/lenis` (`lenis`) provides continuous, inertia-based kinetic scrolling across the entire web application.
- **Refresh-Rate Normalization**: Automatically interpolates at 60Hz and high-refresh-rate 120Hz/144Hz displays for consistent smoothness.
- **Scroll Hijack Prevention**: Configured with `data-lenis-prevent` attributes across all interactive overlays (such as `ShareReelModal`, `MediaUploadPreviewModal`, `ReelCommentsSidePanel`, and message detail drawers) to prevent background page scroll bleed while users scroll nested comments or media lists.

### 13. Emoji Picker React Integration
- **Full-Spectrum Unicode Picker**: Integrated `emoji-picker-react` delivers a native, searchable emoji suite complete with categories (Smileys, Animals, Food, Activities, Travel, Objects, Symbols, Flags) and skin tone customizers.
- **Universal Chat & Composer Studio**:
  - Embedded into the direct and group chat composer inputs for fast one-tap insertions.
  - Built into the **Media Upload Preview Studio** to allow users to attach expressive emoji-rich captions directly to photos and videos before publishing.
  - Powers interactive message reaction drawers and comments response fields.
- **Smart Responsive Positioning**: Dynamically calculates viewport boundaries with elevated `z-[9999]` stacking to ensure popover trays never clip or render off-screen.

---

## Database Schema & Data Model

The application uses PostgreSQL managed through TypeORM entities:

```mermaid
erDiagram
    USER {
        uuid id PK
        varchar username UK
        varchar email UK
        varchar password
        varchar googleId
        varchar fullName
        text bio
        date birthday
        varchar gender
        text avatarUrl
        text bannerUrl
        boolean isPrivate
        json archivedChats
        json mutedChats
        json pinnedChats
        json blockedUsers
        timestamp createdAt
        timestamp updatedAt
    }

    FOLLOW {
        uuid id PK
        uuid followerId FK
        uuid followingId FK
        timestamp createdAt
    }

    FOLLOW_REQUEST {
        uuid id PK
        uuid requesterId FK
        uuid recipientId FK
        varchar status
        timestamp createdAt
    }

    NOTIFICATION {
        uuid id PK
        uuid actorId FK
        uuid recipientId FK
        varchar entityType
        uuid entityId
        varchar type
        boolean isRead
        timestamp createdAt
    }

    POST {
        uuid id PK
        uuid userId FK
        text content
        json mediaUrls
        varchar mediaType
        json pollOptions
        timestamp pollExpiresAt
        int likesCount
        int commentsCount
        int repostsCount
        int bookmarksCount
        timestamp createdAt
        timestamp updatedAt
    }

    POST_LIKE {
        uuid id PK
        uuid userId FK
        uuid postId FK
        timestamp createdAt
    }

    POST_BOOKMARK {
        uuid id PK
        uuid userId FK
        uuid postId FK
        uuid collectionId FK
        timestamp createdAt
    }

    COMMENT {
        uuid id PK
        uuid postId FK
        uuid userId FK
        uuid parentId FK
        text content
        int likesCount
        timestamp createdAt
        timestamp updatedAt
    }

    COMMENT_LIKE {
        uuid id PK
        uuid userId FK
        uuid commentId FK
        timestamp createdAt
    }

    POLL_VOTE {
        uuid id PK
        uuid userId FK
        uuid postId FK
        uuid optionId
        timestamp createdAt
    }

    REEL {
        uuid id PK
        uuid userId FK
        text videoUrl
        text thumbnailUrl
        text caption
        float duration
        int viewsCount
        int likesCount
        int commentsCount
        timestamp createdAt
    }

    REEL_LIKE {
        uuid id PK
        uuid userId FK
        uuid reelId FK
        timestamp createdAt
    }

    REEL_BOOKMARK {
        uuid id PK
        uuid userId FK
        uuid reelId FK
        uuid collectionId FK
        timestamp createdAt
    }

    REEL_COMMENT {
        uuid id PK
        uuid userId FK
        uuid reelId FK
        uuid parentId FK
        text content
        boolean isPinned
        timestamp createdAt
    }

    REEL_COMMENT_REACTION {
        uuid id PK
        uuid userId FK
        uuid commentId FK
        varchar reaction
        timestamp createdAt
    }

    STORY {
        uuid id PK
        uuid userId FK
        text mediaUrl
        varchar mediaType
        text caption
        timestamp expiresAt
        int viewsCount
        int likesCount
        timestamp createdAt
    }

    BOOKMARK_COLLECTION {
        uuid id PK
        uuid userId FK
        varchar name
        varchar color
        int itemsCount
        timestamp createdAt
    }

    MESSAGE {
        uuid id PK
        uuid senderId FK
        uuid receiverId FK
        text content
        varchar messageType
        text mediaUrl
        json callLog
        boolean isRead
        boolean isEdited
        boolean isDeleted
        boolean isStarred
        boolean isPinned
        timestamp createdAt
    }

    GROUP_CHAT {
        uuid id PK
        varchar name
        text avatarUrl
        uuid createdById FK
        timestamp createdAt
    }

    GROUP_MEMBER {
        uuid id PK
        uuid groupId FK
        uuid userId FK
        varchar role
        timestamp joinedAt
    }

    GROUP_MESSAGE {
        uuid id PK
        uuid groupId FK
        uuid senderId FK
        text content
        varchar messageType
        text mediaUrl
        timestamp createdAt
    }

    GLOBAL_MESSAGE {
        uuid id PK
        uuid userId FK
        text content
        json reactions
        timestamp createdAt
    }

    USER ||--o{ FOLLOW : initiates
    USER ||--o{ FOLLOW : receives
    USER ||--o{ FOLLOW_REQUEST : requests
    USER ||--o{ FOLLOW_REQUEST : receives
    USER ||--o{ NOTIFICATION : generates
    USER ||--o{ NOTIFICATION : receives

    USER ||--o{ POST : publishes
    POST ||--o{ POST_LIKE : receives
    USER ||--o{ POST_LIKE : likes
    POST ||--o{ COMMENT : contains
    USER ||--o{ COMMENT : writes
    COMMENT o|--o{ COMMENT : replies_to
    COMMENT ||--o{ COMMENT_LIKE : receives
    USER ||--o{ COMMENT_LIKE : likes
    POST ||--o{ POLL_VOTE : collects
    USER ||--o{ POLL_VOTE : casts

    USER ||--o{ BOOKMARK_COLLECTION : owns
    USER ||--o{ POST_BOOKMARK : saves
    POST ||--o{ POST_BOOKMARK : bookmarked
    BOOKMARK_COLLECTION o|--o{ POST_BOOKMARK : organizes

    USER ||--o{ REEL : publishes
    REEL ||--o{ REEL_LIKE : receives
    USER ||--o{ REEL_LIKE : likes
    REEL ||--o{ REEL_COMMENT : contains
    USER ||--o{ REEL_COMMENT : writes
    REEL_COMMENT o|--o{ REEL_COMMENT : replies_to
    REEL_COMMENT ||--o{ REEL_COMMENT_REACTION : receives
    USER ||--o{ REEL_COMMENT_REACTION : reacts
    USER ||--o{ REEL_BOOKMARK : saves
    REEL ||--o{ REEL_BOOKMARK : bookmarked
    BOOKMARK_COLLECTION o|--o{ REEL_BOOKMARK : organizes

    USER ||--o{ STORY : publishes

    USER ||--o{ MESSAGE : sends
    USER ||--o{ MESSAGE : receives

    USER ||--o{ GROUP_CHAT : creates
    GROUP_CHAT ||--o{ GROUP_MEMBER : has
    USER ||--o{ GROUP_MEMBER : joins
    GROUP_CHAT ||--o{ GROUP_MESSAGE : contains
    USER ||--o{ GROUP_MESSAGE : sends

    USER ||--o{ GLOBAL_MESSAGE : writes
```

---

## WebSockets & WebRTC Signaling

Echolet utilizes Socket.io to synchronize real-time updates and orchestrate WebRTC P2P audio calling:

### Socket Event Specifications

| Channel / Area | Event Name | Direction | Payload Description |
|---|---|---|---|
| **Presence** | `user_online` | Server → Client | Broadcasts online status for user ID |
| **Presence** | `user_offline` | Server → Client | Broadcasts offline status for user ID |
| **Direct Messaging** | `send_message` | Client → Server | Dispatches new 1-to-1 message |
| **Direct Messaging** | `new_message` | Server → Client | Delivers incoming message to recipient room |
| **Direct Messaging** | `typing_start` / `typing_stop` | Both | Syncs active typing indicators between users |
| **Direct Messaging** | `message_read` | Both | Emits read receipts for sent messages |
| **Direct Messaging** | `message_reaction` | Both | Syncs emoji reaction updates |
| **Direct Messaging** | `message_edited` | Both | Emits updated text content for message |
| **Direct Messaging** | `message_deleted` | Both | Emits soft-delete notification |
| **Group Chat** | `join_group` | Client → Server | Subscribes socket to group room |
| **Group Chat** | `new_group_message` | Server → Client | Broadcasts group message to all active members |
| **Voice Call (WebRTC)** | `call_user` | Client → Server | Initiates call offer with SDP metadata |
| **Voice Call (WebRTC)** | `incoming_call` | Server → Client | Displays incoming call screen to callee |
| **Voice Call (WebRTC)** | `accept_call` | Client → Server | Transmits SDP answer accepting voice session |
| **Voice Call (WebRTC)** | `call_accepted` | Server → Client | Completes WebRTC audio bridge initialization |
| **Voice Call (WebRTC)** | `ice_candidate` | Both | Exchanges ICE candidate network routing data |
| **Voice Call (WebRTC)** | `reject_call` | Both | Ends ringing state and logs declined call |
| **Voice Call (WebRTC)** | `end_call` | Both | Closes active peer stream and saves duration |
| **Notifications** | `new_notification` | Server → Client | Pushes live notifications to active recipient |

---

## REST API Reference

The backend exposes unified endpoints mounted under both `/api` and `/` root:

### Authentication (`/api/auth`)
- `POST /register` — Register a new account (`username`, `email`, `password`, `fullName`).
- `POST /login` — Authenticate credentials and receive secure HTTP-only JWT cookie.
- `POST /logout` — Invalidate session and clear authentication cookies.
- `GET /me` — Retrieve the currently authenticated user's profile.
- `POST /google` — Exchange Google OAuth credentials for an authenticated session.
- `GET /google` — Initiate Google OAuth redirect.
- `GET /google/callback` — Google OAuth callback handler.

### Users & Social Graph (`/api/users`)
- `PUT /profile` — Update user profile details, bio, and avatar/banner URLs.
- `GET /search?q={query}` — Search users by username or full name.
- `GET /connections` — Retrieve list of mutual connections and contacts.
- `GET /following` — Fetch list of accounts followed by current user.
- `GET /:username` — Fetch public profile and stats for a given username.
- `POST /:userId/follow` — Follow a specified user account.
- `DELETE /:userId/follow` — Unfollow a specified user account.
- `DELETE /followers/:userId` — Remove user from personal followers list.

### Posts (`/api/posts`)
- `GET /feed` — Fetch paginated chronological feed of posts from followed users.
- `GET /user/:username` — Fetch all posts published by a specific user.
- `GET /:id` — Retrieve single post by unique ID.
- `POST /` — Create a new post (text, media, polls).
- `DELETE /:id` — Delete a post (owner only).
- `POST /:id/like` — Toggle like status on a post.
- `POST /:id/share` — Record post share and retrieve share link.
- `POST /:id/bookmark` — Save/unsave post to default or chosen bookmark folder.
- `PUT /:id/bookmark/collection` — Move bookmarked post to a designated collection.
- `POST /:id/poll/vote` — Submit a vote on an interactive post poll.
- `GET /:id/comments` — Retrieve threaded comment tree for a post.
- `POST /:id/comments` — Add a top-level comment or reply to an existing comment (`parentId`).
- `DELETE /comments/:commentId` — Delete a comment (owner only).
- `POST /comments/:commentId/like` — Toggle like on a specific comment.

### Reels (`/api/reels`)
- `GET /` — Fetch vertical reels video feed.
- `GET /user/:username` — Fetch all reels created by a user.
- `GET /:id` — Retrieve single reel details by ID.
- `POST /` — Upload and publish a new video reel.
- `DELETE /:id` — Delete a reel (owner only).
- `POST /:id/like` — Toggle like status on a reel.
- `POST /:id/bookmark` — Bookmark/unbookmark a reel.
- `PUT /:id/bookmark/collection` — Assign reel bookmark to a collection.
- `GET /:id/comments` — Retrieve reel comments list.
- `POST /:id/comments` — Post comment on a reel.
- `DELETE /comments/:commentId` — Delete reel comment.
- `POST /comments/:commentId/reaction` — React to a reel comment.
- `POST /:id/comments/:commentId/pin` — Pin a highlight comment to the top (creator only).

### Stories (`/api/stories`)
- `GET /` — Fetch active, unexpired stories grouped by user.
- `POST /` — Create and publish an ephemeral 24-hour story.
- `POST /:id/view` — Record story impression.
- `POST /:id/like` — Toggle like on a story.
- `DELETE /:id` — Delete a story prior to expiration.

### Direct Messaging (`/api/messages`)
- `GET /conversations` — Retrieve all active 1-to-1 conversation threads with latest message previews.
- `GET /unread-count` — Get total unread message counter.
- `GET /:userId` — Fetch message history with a specific peer.
- `POST /:userId` — Send a direct message (text, media, voice note).
- `PUT /item/:messageId` — Edit content of a sent message.
- `DELETE /item/:messageId` — Soft-delete a message.
- `POST /item/:messageId/reaction` — Add/toggle emoji reaction on a message.
- `POST /item/:messageId/star` — Toggle starred status on a message.
- `POST /:userId/read` — Mark conversation messages as read.
- `POST /:userId/clear` — Clear message thread history.

### Group Chats (`/api/groups`)
- `GET /` — List all groups the current user belongs to.
- `POST /` — Create a new group chat.
- `GET /:groupId` — Get metadata and member roster for a group.
- `PUT /:groupId` — Update group name or avatar image.
- `GET /:groupId/messages` — Fetch group message history.
- `POST /:groupId/messages` — Post message into group chat.
- `POST /:groupId/members` — Add members to group.
- `DELETE /:groupId/members/:userId` — Remove member from group.
- `PUT /:groupId/members/:userId/role` — Update member permissions (`admin` / `member`).
- `POST /:groupId/leave` — Leave group chat.

### Bookmark Collections (`/api/collections`)
- `GET /` — List user's custom bookmark collections with item counts.
- `POST /` — Create a new collection folder (`name`, `color`).
- `PUT /:id` — Rename or update color badge of a collection.
- `DELETE /:id` — Delete collection folder (items are preserved in default saved list).

### Notifications (`/api/notifications`)
- `GET /` — Retrieve user's notification list.
- `GET /unread-count` — Retrieve unread notifications badge count.
- `PUT /read-all` — Mark all notifications as read.
- `PUT /:id/read` — Mark a single notification as read.
- `DELETE /:id` — Dismiss a notification.

### Media Upload (`/api/upload`)
- `POST /` — Upload single or multiple files (images, audio, video) to Supabase Storage with category tagging (`avatars`, `posts`, `stories`, `reels`, `chat`).
- `DELETE /` — Remove an uploaded file from Supabase Storage by public URL.

---

## Project Directory Layout

```
Echolet/
├── client/                           # React 19 Frontend Application
│   ├── public/                       # Static public assets (icons, logos)
│   ├── src/
│   │   ├── api/                      # Axios client configuration & base URL
│   │   ├── assets/                   # Vector graphics, brand illustrations
│   │   ├── components/               # Structured component library
│   │   │   ├── chat/                 # MediaUploadPreviewModal, VoiceCallModal, CallBar
│   │   │   ├── common/               # Avatar, Modal, Logo, Button, Dropdown
│   │   │   ├── layout/               # AppLayout, Sidebar, BottomBar, Navbar
│   │   │   ├── post/                 # PostCard, CreatePostModal, PollView
│   │   │   ├── reel/                 # ReelCard, ReelCommentsSidePanel, ShareReelModal
│   │   │   └── story/                # StoryViewer, StoryBar, CreateStoryModal
│   │   ├── context/                  # React Contexts (CallContext, MessageContext)
│   │   ├── hooks/                    # Custom hooks (useLenis, useMessage)
│   │   ├── pages/                    # Application route views
│   │   │   ├── settings/             # EditProfile, Account, Privacy, Notifications
│   │   │   ├── Home.tsx              # Main feed view
│   │   │   ├── Reels.tsx             # Vertical short-video reels player
│   │   │   ├── Messages.tsx          # Direct, Group, and Global chat studio
│   │   │   ├── Profile.tsx           # User profile & feed view
│   │   │   ├── Saved.tsx             # Bookmark collections & folders
│   │   │   ├── Search.tsx            # Universal multi-entity search
│   │   │   ├── Notifications.tsx     # Activity notifications list
│   │   │   ├── Login.tsx             # Authentication login screen
│   │   │   └── Register.tsx          # Account registration screen
│   │   ├── services/                 # API service adapters
│   │   ├── App.tsx                   # Route definitions & providers
│   │   ├── index.css                 # Tailwind CSS v4 styling & animations
│   │   └── main.tsx                  # Application entry point
│   ├── package.json
│   └── vite.config.ts
│
├── server/                           # Express 5 & TypeORM Backend
│   ├── src/
│   │   ├── config/                   # Database (PostgreSQL/SQLite) & Column definitions
│   │   ├── controllers/              # REST Request handlers
│   │   │   ├── auth.controller.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── post.controller.ts
│   │   │   ├── reel.controller.ts
│   │   │   ├── story.controller.ts
│   │   │   ├── message.controller.ts
│   │   │   ├── group.controller.ts
│   │   │   ├── globalChat.controller.ts
│   │   │   ├── collection.controller.ts
│   │   │   ├── notification.controller.ts
│   │   │   ├── search.controller.ts
│   │   │   └── upload.controller.ts
│   │   ├── entities/                 # TypeORM Database Entities (User, Post, Reel, etc.)
│   │   ├── middlewares/              # JWT verification & ownership guards
│   │   ├── routes/                   # Express router manifests
│   │   ├── services/                 # Supabase Storage client & file operations
│   │   ├── scripts/                  # Data migration scripts
│   │   ├── app.ts                    # Express application configuration
│   │   ├── server.ts                 # HTTP server bootstrap
│   │   └── socket.ts                 # Socket.io lifecycle & WebRTC signaling
│   ├── package.json
│   └── tsconfig.json
│
└── README.md                         # Project documentation
```

---

## Environment Configuration

### Server Configuration (`server/.env`)

```ini
# Server Port (Local standalone only)
PORT=3000

# PostgreSQL Database Connection String (Supabase / Neon / Railway)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres

# Supabase Storage Configuration (Store secret service role key ONLY on backend!)
SUPABASE_URL=https://[YOUR-PROJECT-ID].supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
SUPABASE_STORAGE_BUCKET=echolet-media

# JWT Authentication
JWT_SECRET=your_super_long_secret_key_here
JWT_EXPIRES_IN=7d

# Environment
NODE_ENV=development

# Allowed Frontend Origins (Comma-separated)
CLIENT_ORIGIN=http://localhost:5173,https://your-domain.vercel.app

# Google OAuth 2.0 Credentials (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Client Configuration (`client/.env`)

```ini
# Backend API Base URL
VITE_SERVER_URL=http://localhost:3000

# Google OAuth Public Client ID (Optional)
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```

---

## Getting Started

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm** or **yarn** / **pnpm**
- **PostgreSQL Database** (e.g. Supabase, Neon, or local Postgres)
- **Supabase Account** with an initialized Storage bucket named `echolet-media`

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/Echolet.git
cd Echolet
```

### 2. Backend Setup
```bash
cd server
npm install

# Copy environment template and configure your credentials
cp .env.example .env

# Start backend in development mode with nodemon & ts-node
npm run dev
```
The server will initialize at `http://localhost:3000` and automatically connect to your database.

### 3. Frontend Setup
In a new terminal window:
```bash
cd client
npm install

# Copy environment template
cp .env.example .env

# Launch Vite development server
npm run dev
```
The application will be accessible at `http://localhost:5173`.

---

## Deployment Guide

### Deploying Frontend to Vercel
1. Set the root directory of the project in Vercel to `client`.
2. Framework Preset: **Vite**.
3. Build Command: `npm run build`.
4. Output Directory: `dist`.
5. Environment Variable: Set `VITE_SERVER_URL` to your production backend URL.

### Deploying Backend to Vercel / Railway / Render
1. Set the root directory to `server`.
2. Configure environment variables in your provider's dashboard:
   - `DATABASE_URL` (Supabase connection pooler URI on port `5432` or `6543`)
   - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_STORAGE_BUCKET=echolet-media`
   - `JWT_SECRET`
   - `CLIENT_ORIGIN` (Your Vercel frontend URL)
   - `NODE_ENV=production`
3. If deploying on Vercel, the included `vercel.json` and serverless database connection pooling middleware will automatically manage cold starts and connections.

---

<div align="center">

**Built with passion for next-generation social connections.**

</div>
