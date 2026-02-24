'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageSquarePlus, Users, MessageSquare } from 'lucide-react';
import { createChatRoom } from './actions';
import { formatDateTime } from '@tandyr/shared';

interface ChatRoom {
  id: string;
  name: string;
  type: string;
  created_at: string;
  chat_members: { user_id: string; users: { full_name: string } | null }[];
}

interface Employee {
  id: string;
  full_name: string;
  email: string;
}

export function ChatsAdminClient({
  rooms,
  employees,
}: {
  rooms: ChatRoom[];
  employees: Employee[];
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    selectedMembers.forEach((id) => fd.append('member_ids', id));
    startTransition(async () => {
      const result = await createChatRoom(fd);
      if (result?.error) setError(result.error);
      else {
        setCreateOpen(false);
        setSelectedMembers([]);
      }
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Чаты</h1>
          <p className="text-muted-foreground text-sm mt-1">{rooms.length} комнат</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <MessageSquarePlus className="h-4 w-4 mr-2" />
              Создать чат
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новый чат</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Название чата</Label>
                <Input name="name" required placeholder="Общий чат, Смена 1..." />
              </div>
              <div className="space-y-1.5">
                <Label>Тип</Label>
                <Select name="type" defaultValue="group">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="group">Групповой</SelectItem>
                    <SelectItem value="direct">Личный</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Участники</Label>
                <div className="border border-border rounded-xl max-h-48 overflow-y-auto divide-y divide-border">
                  {employees.map((emp) => (
                    <label
                      key={emp.id}
                      className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/50"
                    >
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
                <p className="text-xs text-muted-foreground">
                  Выбрано: {selectedMembers.length}
                </p>
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'Создание...' : 'Создать чат'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {rooms.length === 0 ? (
          <div className="col-span-full text-center py-16 text-muted-foreground">
            Нет активных чатов
          </div>
        ) : (
          rooms.map((room) => (
            <div key={room.id} className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  {room.type === 'group' ? (
                    <Users className="h-5 w-5 text-accent" />
                  ) : (
                    <MessageSquare className="h-5 w-5 text-accent" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{room.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {room.type === 'group' ? 'Групповой' : 'Личный'} · {formatDateTime(room.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {room.chat_members.slice(0, 5).map((m) => (
                  <span
                    key={m.user_id}
                    className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full"
                  >
                    {m.users?.full_name?.split(' ')[0] ?? '—'}
                  </span>
                ))}
                {room.chat_members.length > 5 && (
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    +{room.chat_members.length - 5}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
