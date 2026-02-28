'use client';

import { useState, useTransition, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft, Send, Paperclip, Pencil, Trash2,
  Check, X, ImageIcon, Film,
} from 'lucide-react';
import { sendMessage, editMessage, deleteMessage, uploadChatMedia } from '../actions';
import { formatDateTime } from '@tandyr/shared';

interface MessageRow {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  media_url: string | null;
  media_type: 'image' | 'video' | null;
  edited_at: string | null;
  is_deleted: boolean;
  created_at: string;
  user: { id: string; full_name: string; avatar_url: string | null } | null;
}

interface MemberRow {
  user_id: string;
  user: { id: string; full_name: string; email: string } | null;
}

function Avatar({ name, size = 8 }: { name: string; size?: number }) {
  return (
    <div className={`w-${size} h-${size} rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-semibold text-xs select-none`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function MessageBubble({
  msg,
  isOwn,
  onEdit,
  onDelete,
}: {
  msg: MessageRow;
  isOwn: boolean;
  onEdit: (msg: MessageRow) => void;
  onDelete: (id: string) => void;
}) {
  const [hover, setHover] = useState(false);

  if (msg.is_deleted) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1`}>
        <span className="text-xs italic text-muted-foreground px-3 py-1.5 bg-muted rounded-xl">
          Сообщение удалено
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-end gap-2 mb-2 ${isOwn ? 'flex-row-reverse' : ''}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {!isOwn && (
        <Avatar name={msg.user?.full_name ?? '?'} size={7} />
      )}

      <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
        {!isOwn && (
          <p className="text-[10px] text-muted-foreground ml-1 font-medium">
            {msg.user?.full_name}
          </p>
        )}

        <div className={`relative group rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isOwn
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-card border border-border text-foreground rounded-bl-sm'
        }`}>
          {/* Media */}
          {msg.media_url && msg.media_type === 'image' && (
            <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="block mb-1">
              <img
                src={msg.media_url}
                alt="фото"
                className="max-w-full rounded-lg max-h-64 object-cover"
              />
            </a>
          )}
          {msg.media_url && msg.media_type === 'video' && (
            <video
              src={msg.media_url}
              controls
              className="max-w-full rounded-lg max-h-48 mb-1"
            />
          )}

          {/* Content */}
          {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}

          {/* Edited mark */}
          {msg.edited_at && (
            <p className={`text-[9px] mt-0.5 ${isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
              изменено
            </p>
          )}
        </div>

        {/* Time + actions */}
        <div className={`flex items-center gap-2 px-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
          <p className="text-[10px] text-muted-foreground">{formatDateTime(msg.created_at)}</p>
          {isOwn && hover && !msg.is_deleted && (
            <div className="flex items-center gap-1">
              {!msg.media_url && (
                <button
                  onClick={() => onEdit(msg)}
                  className="p-0.5 hover:text-foreground text-muted-foreground transition-colors"
                  title="Редактировать"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}
              <button
                onClick={() => onDelete(msg.id)}
                className="p-0.5 hover:text-destructive text-muted-foreground transition-colors"
                title="Удалить"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ChatRoomClient({
  room,
  initialMessages,
  members,
  adminUser,
}: {
  room: { id: string; name: string; room_type: string };
  initialMessages: MessageRow[];
  members: MemberRow[];
  adminUser: { id: string; full_name: string } | null;
}) {
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages);
  const [text, setText] = useState('');
  const [editingMsg, setEditingMsg] = useState<MessageRow | null>(null);
  const [editText, setEditText] = useState('');
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const senderId = adminUser?.id ?? '';

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Supabase Realtime subscription
  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const channel = supabase
      .channel(`room:${room.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `room_id=eq.${room.id}` },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch with user join
            const { data } = await supabase
              .from('messages')
              .select('*, user:users(id, full_name, avatar_url)')
              .eq('id', (payload.new as any).id)
              .single();
            if (data) setMessages((prev) => [...prev.filter(m => m.id !== data.id), data]);
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) =>
              prev.map((m) => m.id === (payload.new as any).id ? { ...m, ...(payload.new as any) } : m)
            );
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [room.id]);

  const handleSend = useCallback(() => {
    if (!text.trim() || !senderId) return;
    const content = text;
    setText('');
    const fd = new FormData();
    fd.set('content', content);
    fd.set('sender_id', senderId);
    startTransition(async () => {
      const res = await sendMessage(room.id, fd);
      if (res?.message) {
        setMessages((prev) => [...prev.filter(m => m.id !== res.message.id), res.message]);
      }
    });
  }, [text, senderId, room.id]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEditSave = () => {
    if (!editingMsg || !editText.trim()) return;
    const id = editingMsg.id;
    const content = editText;
    setEditingMsg(null);
    startTransition(async () => {
      await editMessage(id, content);
      setMessages((prev) =>
        prev.map((m) => m.id === id ? { ...m, content, edited_at: new Date().toISOString() } : m)
      );
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Удалить сообщение?')) return;
    startTransition(async () => {
      await deleteMessage(id);
      setMessages((prev) =>
        prev.map((m) => m.id === id ? { ...m, is_deleted: true, content: '' } : m)
      );
    });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !senderId) return;
    const fd = new FormData();
    fd.set('file', file);
    fd.set('sender_id', senderId);
    startTransition(async () => {
      const res = await uploadChatMedia(room.id, fd);
      if (res?.message) {
        setMessages((prev) => [...prev.filter(m => m.id !== res.message.id), res.message]);
      }
    });
    e.target.value = '';
  };

  const ROOM_TYPE_LABELS: Record<string, string> = {
    general: 'Общий',
    admin_support: 'Поддержка',
    tech_city: 'Тех. специалист',
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border bg-card shrink-0">
        <Link
          href="/chats"
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-semibold text-sm truncate">{room.name}</h1>
          <p className="text-xs text-muted-foreground">
            {ROOM_TYPE_LABELS[room.room_type] ?? room.room_type} · {members.length} участников
          </p>
        </div>
        {/* Members avatars */}
        <div className="flex -space-x-1.5">
          {members.slice(0, 4).map((m) => (
            <div key={m.user_id} className="w-7 h-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-semibold text-muted-foreground" title={m.user?.full_name ?? ''}>
              {(m.user?.full_name ?? '?').charAt(0).toUpperCase()}
            </div>
          ))}
          {members.length > 4 && (
            <div className="w-7 h-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-semibold text-muted-foreground">
              +{members.length - 4}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-0.5 bg-background">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">Нет сообщений. Начните разговор.</p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            isOwn={msg.user_id === senderId}
            onEdit={(m) => { setEditingMsg(m); setEditText(m.content); }}
            onDelete={handleDelete}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Edit bar */}
      {editingMsg && (
        <div className="px-6 py-2 border-t border-amber-200 bg-amber-50 flex items-center gap-3 shrink-0">
          <Pencil className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          <Input
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="flex-1 h-8 text-sm border-amber-200"
            onKeyDown={(e) => { if (e.key === 'Enter') handleEditSave(); if (e.key === 'Escape') setEditingMsg(null); }}
            autoFocus
          />
          <button onClick={handleEditSave} className="p-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600" disabled={isPending}>
            <Check className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setEditingMsg(null)} className="p-1.5 hover:bg-amber-100 rounded-lg">
            <X className="h-3.5 w-3.5 text-amber-700" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="px-6 py-4 border-t border-border bg-card shrink-0">
        {!adminUser && (
          <p className="text-xs text-destructive mb-2">Нет аккаунта администратора для отправки</p>
        )}
        <div className="flex items-end gap-2">
          <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFile} />
          <button
            onClick={() => fileRef.current?.click()}
            className="p-2.5 hover:bg-muted rounded-xl transition-colors text-muted-foreground hover:text-foreground"
            disabled={isPending || !adminUser}
            title="Прикрепить файл"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Написать сообщение…"
            disabled={isPending || !adminUser}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-input bg-background px-4 py-2.5 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[42px] max-h-[120px]"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = 'auto';
              t.style.height = `${Math.min(t.scrollHeight, 120)}px`;
            }}
          />
          <Button
            onClick={handleSend}
            disabled={isPending || !text.trim() || !adminUser}
            size="icon"
            className="rounded-xl h-10 w-10 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {isPending && (
          <p className="text-xs text-muted-foreground mt-1.5 ml-12">Отправка…</p>
        )}
      </div>
    </div>
  );
}
