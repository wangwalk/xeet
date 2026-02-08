function truncate(text: string, max: number): string {
  if (!text) return "";
  const oneLine = text.replace(/\n/g, " ");
  return oneLine.length <= max ? oneLine : oneLine.slice(0, max - 1) + "\u2026";
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function padEnd(s: string, n: number): string {
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

function padStart(s: string, n: number): string {
  return s.length >= n ? s : " ".repeat(n - s.length) + s;
}

function resolveUser(authorId: string, includes?: any): string {
  if (!includes?.users) return authorId;
  const u = includes.users.find((u: any) => u.id === authorId);
  return u ? `@${u.username}` : authorId;
}

function formatPost(data: any): string {
  const user = data.author ? `@${data.author.username}` : (data.authorId || "");
  const time = data.createdAt ? timeAgo(data.createdAt) : "";
  const metrics = data.publicMetrics;
  const lines: string[] = [];
  if (user || time) {
    lines.push([user, time].filter(Boolean).join(" \u00b7 "));
  }
  if (data.text) lines.push(data.text);
  if (metrics) {
    const parts: string[] = [];
    if (metrics.retweetCount != null) parts.push(`${metrics.retweetCount} RT`);
    if (metrics.likeCount != null) parts.push(`${metrics.likeCount} likes`);
    if (metrics.replyCount != null) parts.push(`${metrics.replyCount} replies`);
    if (parts.length) lines.push(parts.join("  "));
  }
  return lines.join("\n");
}

function formatPostList(data: any): string {
  const posts: any[] = data.posts ?? [];
  if (!posts.length) return "(no posts)";
  const rows = posts.map((p: any) => {
    const author = resolveUser(p.authorId, data.includes);
    const text = truncate(p.text || "", 50);
    const time = p.createdAt ? timeAgo(p.createdAt) : "";
    const likes = p.publicMetrics?.likeCount ?? "";
    return { author, text, time, likes: String(likes) };
  });

  const aW = Math.max(7, ...rows.map((r) => r.author.length));
  const tW = Math.max(4, ...rows.map((r) => r.text.length));

  return rows
    .map((r) => `${padEnd(r.author, aW)}  ${padEnd(r.text, tW)}  ${padEnd(r.time, 4)}  ${padStart(r.likes, 5)}`)
    .join("\n");
}

function formatUserProfile(data: any): string {
  const lines: string[] = [];
  const handle = data.username ? `@${data.username}` : "";
  const name = data.name || "";
  lines.push(handle + (name ? ` (${name})` : ""));
  if (data.description) lines.push(data.description);
  const pm = data.publicMetrics;
  if (pm) {
    lines.push(`${pm.followersCount ?? 0} followers \u00b7 ${pm.followingCount ?? 0} following`);
  }
  return lines.join("\n");
}

function formatUserList(data: any): string {
  const users: any[] = data.users ?? [];
  if (!users.length) return "(no users)";
  const rows = users.map((u: any) => ({
    handle: `@${u.username || ""}`,
    name: u.name || "",
    followers: String(u.publicMetrics?.followersCount ?? ""),
  }));

  const hW = Math.max(9, ...rows.map((r) => r.handle.length));
  const nW = Math.max(4, ...rows.map((r) => r.name.length));

  return rows
    .map((r) => `${padEnd(r.handle, hW)}  ${padEnd(r.name, nW)}  ${padStart(r.followers, 9)}`)
    .join("\n");
}

function formatThread(data: any): string {
  const posts: any[] = data.thread ?? [];
  const lines = [`Thread (${posts.length} posts):`];
  posts.forEach((p: any, i: number) => {
    const id = p?.id ?? "?";
    const text = truncate(p?.text || "", 60);
    lines.push(`  ${i + 1}. ${id}: ${text}`);
  });
  return lines.join("\n");
}

function formatCounts(data: any): string {
  const counts: any[] = data.counts ?? [];
  if (!counts.length) return "(no data)";
  const total = data.meta?.totalTweetCount;
  const lines = counts.map((c: any) => {
    const time = c.start ? new Date(c.start).toISOString().slice(0, 16).replace("T", " ") : "";
    return `${padEnd(time, 16)}  ${padStart(String(c.tweetCount ?? 0), 8)}`;
  });
  if (total != null) lines.push(`Total: ${total}`);
  return lines.join("\n");
}

function formatSimpleAction(verb: string, data: any): string {
  const id = data.id || "";
  return `${verb}: ${id}`;
}

function formatAuthLogin(data: any): string {
  const lines = [data.message || "Authenticated"];
  if (data.scope) lines.push(`Scope: ${data.scope}`);
  if (data.expiresIn) lines.push(`Expires in: ${data.expiresIn}s`);
  if (data.path) lines.push(`Saved to: ${data.path}`);
  return lines.join("\n");
}

function formatAuthSetup(data: any): string {
  const lines = [data.message || "Credentials saved"];
  if (data.path) lines.push(`Saved to: ${data.path}`);
  return lines.join("\n");
}

function formatAuthStatus(data: any): string {
  if (!data.authenticated) return "Not authenticated";
  const lines: string[] = [];
  lines.push(`Authenticated via ${data.authType} (source: ${data.source})`);
  if (data.user) {
    const u = data.user;
    lines.push(`User: @${u.username || ""} (${u.name || ""})`);
  }
  if (data.scope) lines.push(`Scope: ${data.scope}`);
  if (data.expiresAt) lines.push(`Expires: ${data.expiresAt}`);
  return lines.join("\n");
}

const formatters: Record<string, (data: any) => string> = {
  post: (d) => `Posted: ${d?.id ?? ""}\n${d?.text ?? ""}`,
  reply: (d) => `Posted: ${d?.id ?? ""}\n${d?.text ?? ""}`,
  quote: (d) => `Posted: ${d?.id ?? ""}\n${d?.text ?? ""}`,
  thread: formatThread,
  delete: (d) => formatSimpleAction("Deleted", d),
  read: formatPost,
  lookup: formatPostList,
  timeline: formatPostList,
  search: formatPostList,
  mentions: formatPostList,
  liked: formatPostList,
  bookmarks: formatPostList,
  "search-all": formatPostList,
  counts: formatCounts,
  "counts-all": formatCounts,
  "liking-users": formatUserList,
  "reposted-by": formatUserList,
  "hide-reply": (d) => `Hidden: ${d.id}`,
  "unhide-reply": (d) => `Unhidden: ${d.id}`,
  user: formatUserProfile,
  followers: formatUserList,
  following: formatUserList,
  like: (d) => formatSimpleAction("Liked", d),
  unlike: (d) => formatSimpleAction("Unliked", d),
  repost: (d) => formatSimpleAction("Reposted", d),
  unrepost: (d) => formatSimpleAction("Unreposted", d),
  bookmark: (d) => formatSimpleAction("Bookmarked", d),
  unbookmark: (d) => formatSimpleAction("Unbookmarked", d),
  "auth-login": formatAuthLogin,
  "auth-setup": formatAuthSetup,
  "auth-status": formatAuthStatus,
};

export function formatHuman(command: string, data: unknown): string {
  const fn = formatters[command];
  if (fn) return fn(data);
  // Fallback: simple key-value dump
  if (data && typeof data === "object") {
    return Object.entries(data as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
      .join("\n");
  }
  return String(data);
}
