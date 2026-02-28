'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageSquarePlus, MessageSquare, Users, ChevronRight } from 'lucide-react';
import { createChatRoom } from './actions';
import { formatDateTime } from '@tandyr/shared';

interface RoomMember {
  user_id: string;
  user: { id: string; full_name: string } | null;
}

interface ChatRoomRow {
  id: string;
  name: string;
  type: string;
  room_type: string;
  created_at: string;
  members: RoomMember[];
  last_message: { content: string; media_type: string | null; created_at: string; user: { full_name: string } | null } | null;
}

const ROOM_TYPE_LABELS: Record<string, string> = {
  general: 'Общий',
  admin_support: 'Поддержка',
  tech_city: 'Тех. специалист',
};

const ROOM_TYPE_COLORS: Record<string, string> = {
  general: 'bg-muted text-muted-foreground',
  admin_support: 'bg-blue-100 text-blue-700',
  tech_city: 'bg-purple-100 text-purple-700',
};

export function ChatsAdminClient({
  rooms,
  employees,
}: {
  rooms: ChatRoomRow[];
  employees: { id: string; full_name: string; email: string }[];
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggleMember = (id: string) =>
    setSelectedMembers((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    selectedMembers.forEach((id) => fd.append('member_ids', id));
    startTransition(async () => {
      const res = await createChatRoom(fd);
      if (res?.error) setError(res.error);
      else { setCreateOpen(false); setSelectedMembers([]); }
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Чаты</h1>
          <p className="text-muted-foreground text-sm mt-1">{rooms.length} {rooms.length === 1 ? 'чат' : 'чатов'}</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <MessageSquarePlus className="h-4 w-4 mr-2" />
              Новый чат
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Создать чат</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Название чата</Label>
                <Input name="name" placeholder="Например: Поддержка — Иванов И." required />
              </div>
              <div className="space-y-1.5">
                <Label>Тип</Label>
                <select name="room_type" className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option value="general">Общий</option>
                  <option value="admin_support">Поддержка руководства</option>
                  <option value="tech_city">Тех. специалист по городу</option>
                </select>
              </div>
              <input type="hidden" name="type" value="group" />
              <div className="space-y-1.5">
                <Label>Участники</Label>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                  {employees.map((emp) => (
                    <label key={emp.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/40">
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(emp.id)}
                        onChange={() => toggleMember(emp.id)}
                        className="rounded"
                      />
                      <div>
                        <p className="text-sm font-medium">{emp.full_name}</p>
                        <p className="text-xs text-muted-foreground">{emp.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
                {selectedMembers.length > 0 && (
                  <p className="text-xs text-muted-foreground">Выбрано: {selectedMembers.length}</p>
                )}
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'Создание...' : 'Создать'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Chat list */}
      <div className="space-y-2">
        {rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <MessageSquare className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">Нет чатов. Создайте первый.</p>
          </div>
        ) : (
          rooms.map((room) => (
            <Link
              key={room.id}
              href={`/chats/${room.id}`}
              className="flex items-center gap-4 bg-card border border-border rounded-2xl px-5 py-4 hover:bg-muted/30 transition-colors group"
            >
              {/* Avatar */}
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                {room.members.length > 2 ? (
                  <Users className="h-5 w-5 text-primary" />
                ) : (
                  <MessageSquare className="h-5 w-5 text-primary" />
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm truncate">{room.name}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${ROOM_TYPE_COLORS[room.room_type] ?? ROOM_TYPE_COLORS.general}`}>
                    {ROOM_TYPE_LABELS[room.room_type] ?? room.room_type}
                  </span>
                </div>
                {room.last_message ? (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    <span className="font-medium">{room.last_message.user?.full_name}:</span>{' '}
                    {room.last_message.media_type === 'image' ? '📷 Фото' :
                     room.last_message.media_type === 'video' ? '🎥 Видео' :
                     room.last_message.content || '…'}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {room.members.length} участников
                  </p>
                )}
              </div>

              {/* Meta */}
              <div className="shrink-0 text-right">
                {room.last_message && (
                  <p className="text-[10px] text-muted-foreground">
                    {formatDateTime(room.last_message.created_at)}
                  </p>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground mt-1 ml-auto group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
