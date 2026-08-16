import { createClient, type Session } from '@supabase/supabase-js';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

interface CommentRecord {
  id: string;
  parent_id: string | null;
  user_id: string;
  display_name: string;
  body: string;
  created_at: string;
  hidden: boolean;
  is_author: boolean;
}

const SUPABASE_URL = 'https://cihmvyqcgxjltnfzfllx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bI6NC-0ds-HbtAtTo6M4rw_8YWQYpYq';
const OWNER_EMAIL = 'unnobatroo@icloud.com';
const mount = document.querySelector<HTMLElement>('#comments');
const segments = location.pathname.split('/').filter(Boolean);
const slug = segments[segments.indexOf('posts') + 1];

if (mount && slug) {
  const database = createClient(SUPABASE_URL, SUPABASE_KEY);
  let session: Session | null = null;

  const element = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className?: string,
    text?: string,
  ): HTMLElementTagNameMap[K] => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const savedName = () => localStorage.getItem('c_name') ?? '';
  // This controls the UI only. Supabase RLS remains the authorization boundary.
  const isOwner = () => session?.user.email === OWNER_EMAIL;
  const renderMarkdown = (source: string) => DOMPurify.sanitize(marked.parse(source) as string);

  const timeAgo = (iso: string): string => {
    const elapsed = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    const units: Array<[string, number]> = [
      ['y', 31_536_000], ['mo', 2_592_000], ['d', 86_400], ['h', 3_600], ['m', 60],
    ];
    for (const [label, seconds] of units) {
      const amount = Math.floor(elapsed / seconds);
      if (amount >= 1) return `${amount}${label} ago`;
    }
    return 'just now';
  };

  mount.replaceChildren();
  const title = element('h2', 'comments-title', 'Comments');
  const authBox = element('div', 'c-auth');
  const list = element('div', 'c-list');
  mount.append(title, authBox, list);

  const composer = (parentId: string | null): HTMLElement => {
    const box = element('div', parentId ? 'c-box c-replybox' : 'c-box');
    const textarea = element('textarea', 'c-textarea');
    textarea.placeholder = 'Markdown editor';
    textarea.setAttribute('aria-label', parentId ? 'Write a reply' : 'Write a comment');
    const button = element('button', 'c-submit', parentId ? 'Reply' : 'Post');
    button.type = 'button';
    const message = element('p', 'c-msg');

    button.addEventListener('click', async () => {
      const body = textarea.value.trim();
      if (!body || !session) return;
      const displayName = (savedName() || session.user.user_metadata.display_name || 'anon').slice(0, 50);
      button.disabled = true;
      const { error } = await database.from('comments').insert({
        post_slug: slug,
        parent_id: parentId,
        user_id: session.user.id,
        display_name: displayName,
        body: body.slice(0, 5000),
      });
      button.disabled = false;
      if (error) {
        message.className = 'c-msg c-msg--err';
        message.textContent = error.message;
        return;
      }
      textarea.value = '';
      if (parentId) box.remove();
      await loadComments();
    });

    box.append(textarea, button, message);
    return box;
  };

  const registrationBox = (): HTMLElement => {
    const box = element('div', 'c-box');
    box.append(element('p', undefined, 'Feel free to join the discussion! First fill in the details to authenticate.'));
    const row = element('div', 'c-row');
    const name = element('input', 'c-input');
    name.placeholder = 'name';
    name.setAttribute('aria-label', 'Display name');
    name.maxLength = 50;
    name.value = savedName();
    const email = element('input', 'c-input');
    email.placeholder = 'email';
    email.setAttribute('aria-label', 'Email address');
    email.type = 'email';
    row.append(name, email);
    const button = element('button', 'c-submit', 'Send');
    button.type = 'button';
    const message = element('p', 'c-msg');

    button.addEventListener('click', async () => {
      const displayName = name.value.trim();
      const emailAddress = email.value.trim();
      if (!displayName) {
        message.className = 'c-msg c-msg--err';
        message.textContent = 'Please enter a name.';
        return;
      }
      if (!/.+@.+\..+/.test(emailAddress)) {
        message.className = 'c-msg c-msg--err';
        message.textContent = 'Please enter a valid email.';
        return;
      }

      localStorage.setItem('c_name', displayName.slice(0, 50));
      button.disabled = true;
      button.textContent = 'Sending…';
      const { error } = await database.auth.signInWithOtp({
        email: emailAddress,
        options: {
          emailRedirectTo: location.href,
          data: { display_name: displayName },
        },
      });
      button.disabled = false;
      button.textContent = 'Send';
      message.className = error ? 'c-msg c-msg--err' : 'c-msg c-msg--ok';
      message.textContent = error
        ? error.message
        : `Check ${emailAddress} inbox and spam for a confirmation link, then come back to this page.`;
    });

    box.append(row, button, message);
    return box;
  };

  const renderAuth = (): void => {
    authBox.replaceChildren();
    if (!session) {
      authBox.append(registrationBox());
      return;
    }

    const name = savedName() || session.user.user_metadata.display_name || session.user.email || 'anonymous';
    const box = element('div', 'c-who');
    const who = element('span');
    who.append('Commenting as ');
    who.append(element('strong', undefined, name));
    const actions = element('span', 'c-who-actions');
    const changeName = element('button', 'c-btn--link', 'change name');
    changeName.type = 'button';
    changeName.addEventListener('click', () => {
      const nextName = prompt('Display name:', name)?.trim();
      if (!nextName) return;
      const cleanName = nextName.slice(0, 50);
      localStorage.setItem('c_name', cleanName);
      void database.auth.updateUser({ data: { display_name: cleanName } });
      renderAuth();
    });
    const signOut = element('button', 'c-btn--link', 'sign out');
    signOut.type = 'button';
    signOut.addEventListener('click', () => { void database.auth.signOut(); });
    actions.append(changeName, document.createTextNode(' · '), signOut);
    box.append(who, actions);
    authBox.append(box, composer(null));
  };

  // Parent groups are built once, then rendered recursively as a thread.
  const buildLevel = (comments: CommentRecord[], byParent: Map<string, CommentRecord[]>): HTMLUListElement => {
    const thread = element('ul', 'c-thread');
    comments.forEach((comment) => thread.append(buildItem(comment, byParent)));
    return thread;
  };

  const buildItem = (comment: CommentRecord, byParent: Map<string, CommentRecord[]>): HTMLLIElement => {
    const item = element('li', 'c-item');
    const children = byParent.get(comment.id) ?? [];
    if (children.length > 0) item.classList.add('has-kids');
    const main = element('div', 'c-main');

    if (comment.hidden) {
      main.append(element('div', 'c-body c-removed', '[removed]'));
    } else {
      const collapse = element('button', 'c-collapse', '−');
      collapse.type = 'button';
      collapse.setAttribute('aria-label', 'Collapse comment');
      collapse.addEventListener('click', () => {
        const collapsed = item.classList.toggle('collapsed');
        collapse.textContent = collapsed ? '+' : '−';
        collapse.setAttribute('aria-label', collapsed ? 'Expand comment' : 'Collapse comment');
      });
      item.append(collapse);

      const heading = element('div', 'c-head');
      heading.append(element('span', 'c-name', comment.display_name));
      if (comment.is_author) heading.append(element('span', 'c-badge', 'author'));
      heading.append(element('span', 'c-time', timeAgo(comment.created_at)));
      const body = element('div', 'c-body');
      body.innerHTML = renderMarkdown(comment.body);
      const actions = element('div', 'c-actions');

      if (session) {
        const reply = element('button', 'c-btn--link', 'reply');
        reply.type = 'button';
        reply.addEventListener('click', () => {
          const openComposer = [...main.children].find((child) => child.classList.contains('c-replybox'));
          if (openComposer) {
            openComposer.remove();
            return;
          }
          main.insertBefore(composer(comment.id), [...main.children].find((child) => child.classList.contains('c-thread')) ?? null);
        });
        actions.append(reply);
      }

      if (isOwner() || session?.user.id === comment.user_id) {
        const remove = element('button', 'c-btn--link', 'delete');
        remove.type = 'button';
        remove.addEventListener('click', async () => {
          if (!confirm('Delete this comment? Replies under it stay, this one shows as [removed].')) return;
          // Soft deletion keeps the reply tree intact.
          const { error } = await database.from('comments')
            .update({ hidden: true, body: '[removed]', display_name: '[removed]' })
            .eq('id', comment.id);
          if (error) alert(error.message);
          else await loadComments();
        });
        actions.append(remove);
      }

      main.append(heading, body, actions);
    }

    if (children.length > 0) main.append(buildLevel(children, byParent));
    item.append(main);
    return item;
  };

  async function loadComments(): Promise<void> {
    const { data, error } = await database.from('comments')
      .select('*')
      .eq('post_slug', slug)
      .order('created_at', { ascending: true });
    if (error) {
      list.replaceChildren(element('p', 'c-msg c-msg--err', `Couldn’t load comments: ${error.message}`));
      return;
    }

    const comments = (data ?? []) as CommentRecord[];
    const byParent = new Map<string, CommentRecord[]>();
    comments.forEach((comment) => {
      const key = comment.parent_id ?? 'root';
      const siblings = byParent.get(key) ?? [];
      siblings.push(comment);
      byParent.set(key, siblings);
    });

    const visible = comments.filter((comment) => !comment.hidden).length;
    title.replaceChildren('Comments ', element('span', 'comments-count', `(${visible})`));
    list.replaceChildren();
    const roots = byParent.get('root') ?? [];
    if (roots.length === 0) {
      list.append(element('p', 'c-note', 'No comments yet. Be the first.'));
    } else {
      list.append(buildLevel(roots, byParent));
    }
  }

  const cameFromMagicLink = location.hash.includes('access_token') || new URLSearchParams(location.search).has('code');
  let scrolled = false;
  const scrollToComments = () => {
    if (scrolled) return;
    scrolled = true;
    mount.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  void database.auth.getSession().then(({ data }) => {
    session = data.session;
    renderAuth();
    if (cameFromMagicLink && session) scrollToComments();
  });
  database.auth.onAuthStateChange((event, nextSession) => {
    session = nextSession;
    renderAuth();
    if (cameFromMagicLink && event === 'SIGNED_IN') scrollToComments();
  });
  void loadComments();
}
