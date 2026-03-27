'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { messagesApi } from '@/lib/api';
import { Message, User, MessageGroup, Conversation } from '@/lib/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { UserAvatar } from '@/components/ui';
import { ChevronLeft, Send, Users, MessageCircle, Lock, Paperclip, X, FileText, Music, Download } from 'lucide-react';

type ViewType = 'list' | 'chat' | 'direct';

export default function StudentMessages() {
  const { user } = useAuth();
  const [view, setView] = useState<ViewType>('list');
  const [groups, setGroups] = useState<MessageGroup[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<MessageGroup | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageContent, setMessageContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [canWrite, setCanWrite] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [grps, convs] = await Promise.all([
        messagesApi.getGroups(),
        messagesApi.getConversations(),
      ]);
      setGroups(grps);
      setConversations(convs);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const openGroupChat = async (group: MessageGroup) => {
    try {
      setSelectedGroup(group);
      setSelectedConversation(null);
      setCanWrite(group.can_write || false);
      setView('chat');
      const data = await messagesApi.getGroup(group.id);
      setMessages(data.messages);
      setCanWrite(data.group.can_write || false);
      // Refresh data to update unread badges
      const [grps, convs] = await Promise.all([
        messagesApi.getGroups(),
        messagesApi.getConversations(),
      ]);
      setGroups(grps);
      setConversations(convs);
    } catch (err) {
      console.error('Error loading group messages:', err);
    }
  };

  const openDirectChat = async (conversation: Conversation) => {
    try {
      setSelectedConversation(conversation);
      setSelectedGroup(null);
      setCanWrite(true); // Students can always reply to admin-initiated conversations
      setView('direct');
      const data = await messagesApi.getMessagesWithUser(conversation.user.id);
      setMessages(data.messages);
      // Refresh data to update unread badges
      const [grps, convs] = await Promise.all([
        messagesApi.getGroups(),
        messagesApi.getConversations(),
      ]);
      setGroups(grps);
      setConversations(convs);
    } catch (err) {
      console.error('Error loading direct messages:', err);
    }
  };

  const sendGroupMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!messageContent.trim() && !selectedFile) || !selectedGroup || !canWrite) return;

    setIsSending(true);
    try {
      const newMessage = await messagesApi.sendToGroup(selectedGroup.id, messageContent, selectedFile ?? undefined);
      setMessages([...messages, newMessage]);
      setMessageContent('');
      setSelectedFile(null);
      const grps = await messagesApi.getGroups();
      setGroups(grps);
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const sendDirectMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!messageContent.trim() && !selectedFile) || !selectedConversation) return;

    setIsSending(true);
    try {
      const newMessage = await messagesApi.send({
        receiver_id: selectedConversation.user.id,
        content: messageContent,
        file: selectedFile ?? undefined,
      });
      setMessages([...messages, newMessage]);
      setMessageContent('');
      setSelectedFile(null);
      const convs = await messagesApi.getConversations();
      setConversations(convs);
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const goBack = () => {
    setView('list');
    setSelectedGroup(null);
    setSelectedConversation(null);
    setMessages([]);
    setCanWrite(false);
    setSelectedFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  // Format name as "Prenom + First letter of last name" (e.g., "Mohamed B.")
  const getDisplayName = (u: User) => {
    let firstName = '';
    let lastName = '';

    if (u.teacher_profile) {
      firstName = u.teacher_profile.first_name || '';
      lastName = u.teacher_profile.last_name || '';
    } else if (u.student_profile) {
      firstName = u.student_profile.first_name || '';
      lastName = u.student_profile.last_name || '';
    }

    if (firstName && lastName) {
      return `${firstName} ${lastName[0]}.`;
    }
    if (firstName) {
      return firstName;
    }
    return u.email.split('@')[0];
  };

  // For admin conversations, show full name
  const getAdminDisplayName = (u: User) => {
    if (u.teacher_profile) {
      const firstName = u.teacher_profile.first_name || '';
      const lastName = u.teacher_profile.last_name || '';
      if (firstName || lastName) {
        return `${firstName} ${lastName}`.trim();
      }
    }
    return u.email.split('@')[0];
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const dayDiff = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (dayDiff === 0) {
      return format(date, 'HH:mm', { locale: fr });
    } else if (dayDiff === 1) {
      return 'Hier';
    } else if (dayDiff < 7) {
      return format(date, 'EEEE', { locale: fr });
    } else {
      return format(date, 'dd/MM/yyyy', { locale: fr });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-4 md:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3 md:w-1/4"></div>
          <div className="h-64 md:h-96 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  // List view - Groups and Direct conversations with admins
  if (view === 'list') {
    const hasContent = groups.length > 0 || conversations.length > 0;

    return (
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-playfair font-semibold text-secondary">Messagerie</h1>
          <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">
            Consultez vos messages et groupes de discussion
          </p>
        </div>

        {!hasContent ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 md:p-12 text-center">
            <MessageCircle size={48} className="text-gray-200 mx-auto mb-4" />
            <h3 className="text-base md:text-lg font-medium text-secondary mb-2">Aucun message</h3>
            <p className="text-gray-500 text-sm md:text-base">Vous n&apos;avez pas encore de messages ou de groupes.</p>
          </div>
        ) : (
          <div className="space-y-4 md:space-y-6">
            {/* Direct conversations with admins */}
            {conversations.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-3 md:p-4 border-b border-gray-100">
                  <h2 className="font-medium text-secondary text-sm md:text-base flex items-center gap-2">
                    <svg className="w-4 h-4 md:w-5 md:h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Messages de l&apos;administration
                  </h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {conversations.map((conv) => {
                    const profile = conv.user.teacher_profile;
                    return (
                    <button
                      key={conv.user.id}
                      onClick={() => openDirectChat(conv)}
                      className="w-full p-3 md:p-4 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center gap-3 md:gap-4"
                    >
                      <div className="relative flex-shrink-0">
                        <UserAvatar
                          firstName={profile?.first_name || ''}
                          lastName={profile?.last_name || ''}
                          gender={profile?.gender}
                          profilePhoto={profile?.profile_photo}
                          role={conv.user.role}
                          size="md"
                          showGenderBadge={false}
                        />
                        {conv.unread_count > 0 && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5 md:mb-1 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="font-medium text-secondary text-sm md:text-base truncate">
                              {getAdminDisplayName(conv.user)}
                            </p>
                            <span className="hidden sm:inline text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full flex-shrink-0">
                              Admin
                            </span>
                          </div>
                          {conv.last_message && (
                            <span className="text-xs text-gray-400 flex-shrink-0">
                              {formatMessageTime(conv.last_message.sent_at)}
                            </span>
                          )}
                        </div>
                        {conv.last_message && (
                          <p className="text-xs md:text-sm text-gray-500 truncate">
                            {conv.last_message.content}
                          </p>
                        )}
                      </div>
                      <ChevronLeft size={18} className="text-gray-400 flex-shrink-0 rotate-180" />
                    </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Groups list */}
            {groups.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-3 md:p-4 border-b border-gray-100">
                  <h2 className="font-medium text-secondary text-sm md:text-base flex items-center gap-2">
                    <Users size={18} className="text-primary" />
                    Groupes de discussion
                  </h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {groups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => openGroupChat(group)}
                      className="w-full p-3 md:p-4 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center gap-3 md:gap-4"
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users size={20} className="text-primary" />
                        </div>
                        {group.unread_count && group.unread_count > 0 && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                            {group.unread_count}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5 md:mb-1 gap-2">
                          <p className="font-medium text-secondary text-sm md:text-base truncate">{group.name}</p>
                          {group.last_message && (
                            <span className="text-xs text-gray-400 flex-shrink-0">
                              {formatMessageTime(group.last_message.sent_at)}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                            {group.members_count} membre{(group.members_count || 0) > 1 ? 's' : ''}
                          </span>
                          {!group.can_write && (
                            <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full flex items-center gap-1">
                              <Lock size={10} />
                              <span className="hidden sm:inline">Lecture seule</span>
                            </span>
                          )}
                        </div>
                        {group.last_message && (
                          <p className="text-xs md:text-sm text-gray-500 truncate mt-1">
                            {group.last_message.content}
                          </p>
                        )}
                      </div>
                      <ChevronLeft size={18} className="text-gray-400 flex-shrink-0 rotate-180" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Direct chat view with admin
  if (view === 'direct' && selectedConversation) {
    return (
      <div className="flex flex-col h-[calc(100vh-56px)] md:h-[calc(100vh-0px)]">
        {/* Header */}
        <div className="flex items-center gap-3 p-3 md:p-4 bg-white border-b border-gray-200 flex-shrink-0">
          <button
            onClick={goBack}
            className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <UserAvatar
            firstName={selectedConversation.user.teacher_profile?.first_name || ''}
            lastName={selectedConversation.user.teacher_profile?.last_name || ''}
            gender={selectedConversation.user.teacher_profile?.gender}
            profilePhoto={selectedConversation.user.teacher_profile?.profile_photo}
            role={selectedConversation.user.role}
            size="sm"
            showGenderBadge={false}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-medium text-secondary text-sm md:text-base truncate">
                {getAdminDisplayName(selectedConversation.user)}
              </h2>
              <span className={`hidden sm:inline text-xs px-2 py-0.5 rounded-full ${
                selectedConversation.user.role === 'admin'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {selectedConversation.user.role === 'admin' ? 'Admin' : 'Enseignant'}
              </span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4 bg-gray-50">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <MessageCircle size={48} className="text-gray-200 mx-auto mb-4" />
                <p className="text-gray-500 text-sm md:text-base">Aucun message</p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, index) => {
                const isOwn = msg.sender_id === user?.id;
                const showDate = index === 0 ||
                  new Date(messages[index - 1].sent_at).toDateString() !== new Date(msg.sent_at).toDateString();

                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="text-center my-3 md:my-4">
                        <span className="text-xs text-gray-400 bg-white px-3 py-1 rounded-full shadow-sm">
                          {format(new Date(msg.sent_at), 'EEEE d MMMM', { locale: fr })}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      {!isOwn && msg.sender && (
                        <div className="mr-2 flex-shrink-0">
                          <UserAvatar
                            firstName={msg.sender.teacher_profile?.first_name || ''}
                            lastName={msg.sender.teacher_profile?.last_name || ''}
                            gender={msg.sender.teacher_profile?.gender}
                            profilePhoto={msg.sender.teacher_profile?.profile_photo}
                            role={msg.sender.role}
                            size="sm"
                            showGenderBadge={false}
                          />
                        </div>
                      )}
                      <div className="max-w-[80%] md:max-w-[70%]">
                        <div className={`px-3 md:px-4 py-2 rounded-2xl ${
                          isOwn
                            ? 'bg-primary text-white rounded-br-md'
                            : 'bg-white text-secondary rounded-bl-md shadow-sm'
                        }`}>
                          {msg.content && (
                            <p className="whitespace-pre-wrap break-words text-sm md:text-base">{msg.content}</p>
                          )}
                          {msg.attachment_url && msg.attachment_type === 'image' && (
                            <img
                              src={msg.attachment_url}
                              alt={msg.attachment_original_name ?? 'image'}
                              className="mt-1 rounded-lg max-w-full max-h-48 object-contain cursor-pointer"
                              onClick={() => window.open(msg.attachment_url!, '_blank')}
                            />
                          )}
                          {msg.attachment_url && msg.attachment_type === 'pdf' && (
                            <a
                              href={msg.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`mt-1 flex items-center gap-2 text-xs underline ${isOwn ? 'text-white/80' : 'text-primary'}`}
                            >
                              <FileText size={14} />
                              <span className="truncate max-w-[180px]">{msg.attachment_original_name ?? 'document.pdf'}</span>
                              <Download size={12} className="flex-shrink-0" />
                            </a>
                          )}
                          {msg.attachment_url && msg.attachment_type === 'audio' && (
                            <div className="mt-1">
                              <audio controls className="max-w-full h-8">
                                <source src={msg.attachment_url} />
                              </audio>
                            </div>
                          )}
                        </div>
                        <p className={`text-xs text-gray-400 mt-1 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>
                          {format(new Date(msg.sent_at), 'HH:mm', { locale: fr })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Message input */}
        <div className="bg-white border-t border-gray-200 flex-shrink-0">
          {selectedFile && (
            <div className="px-3 md:px-4 pt-3 flex items-center gap-2">
              <div className="flex items-center gap-2 bg-primary/10 text-primary text-xs px-3 py-1.5 rounded-lg max-w-xs">
                {selectedFile.type.startsWith('image/') ? (
                  <Paperclip size={14} />
                ) : selectedFile.type === 'application/pdf' ? (
                  <FileText size={14} />
                ) : (
                  <Music size={14} />
                )}
                <span className="truncate">{selectedFile.name}</span>
                <span className="text-primary/60 flex-shrink-0">({formatFileSize(selectedFile.size)})</span>
              </div>
              <button onClick={() => setSelectedFile(null)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
          )}
          <form onSubmit={sendDirectMessage} className="p-3 md:p-4 flex gap-2 md:gap-3">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,audio/mpeg,audio/ogg,audio/wav"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Joindre un fichier"
            >
              <Paperclip size={20} />
            </button>
            <input
              type="text"
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder="Ecrivez votre message..."
              className="flex-1 px-3 md:px-4 py-2.5 md:py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm md:text-base min-h-[44px]"
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={isSending || (!messageContent.trim() && !selectedFile)}
              className="px-4 md:px-6 py-2.5 md:py-3 bg-primary text-white rounded-xl hover:bg-primary/90 active:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-h-[44px] min-w-[44px]"
            >
              {isSending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Send size={20} />
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Group chat view
  return (
    <div className="flex flex-col h-[calc(100vh-56px)] md:h-[calc(100vh-0px)]">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 md:p-4 bg-white border-b border-gray-200 flex-shrink-0">
        <button
          onClick={goBack}
          className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <div className="w-9 h-9 md:w-10 md:h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
          <Users size={18} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-medium text-secondary text-sm md:text-base truncate">{selectedGroup?.name}</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {selectedGroup?.members_count} membre{(selectedGroup?.members_count || 0) > 1 ? 's' : ''}
            </span>
            {!canWrite && (
              <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full flex items-center gap-1">
                <Lock size={10} />
                Lecture seule
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <MessageCircle size={48} className="text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 text-sm md:text-base">Aucun message</p>
              <p className="text-xs md:text-sm text-gray-400 mt-1">
                {canWrite ? 'Envoyez le premier message!' : 'En attente de messages...'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => {
              const isOwn = msg.sender_id === user?.id;
              const showDate = index === 0 ||
                new Date(messages[index - 1].sent_at).toDateString() !== new Date(msg.sent_at).toDateString();

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="text-center my-3 md:my-4">
                      <span className="text-xs text-gray-400 bg-white px-3 py-1 rounded-full shadow-sm">
                        {format(new Date(msg.sent_at), 'EEEE d MMMM', { locale: fr })}
                      </span>
                    </div>
                  )}
                  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    {!isOwn && msg.sender && (
                      <div className="mr-2 flex-shrink-0">
                        <UserAvatar
                          firstName={msg.sender.student_profile?.first_name || msg.sender.teacher_profile?.first_name || ''}
                          lastName={msg.sender.student_profile?.last_name || msg.sender.teacher_profile?.last_name || ''}
                          gender={msg.sender.student_profile?.gender || msg.sender.teacher_profile?.gender}
                          profilePhoto={msg.sender.student_profile?.profile_photo || msg.sender.teacher_profile?.profile_photo}
                          role={msg.sender.role}
                          size="sm"
                          showGenderBadge={false}
                        />
                      </div>
                    )}
                    <div className="max-w-[80%] md:max-w-[70%]">
                      {!isOwn && msg.sender && (
                        <p className="text-xs text-gray-500 mb-1 ml-1">
                          {getDisplayName(msg.sender)}
                        </p>
                      )}
                      <div className={`px-3 md:px-4 py-2 rounded-2xl ${
                        isOwn
                          ? 'bg-primary text-white rounded-br-md'
                          : 'bg-white text-secondary rounded-bl-md shadow-sm'
                      }`}>
                        {msg.content && (
                          <p className="whitespace-pre-wrap break-words text-sm md:text-base">{msg.content}</p>
                        )}
                        {msg.attachment_url && msg.attachment_type === 'image' && (
                          <img
                            src={msg.attachment_url}
                            alt={msg.attachment_original_name ?? 'image'}
                            className="mt-1 rounded-lg max-w-full max-h-48 object-contain cursor-pointer"
                            onClick={() => window.open(msg.attachment_url!, '_blank')}
                          />
                        )}
                        {msg.attachment_url && msg.attachment_type === 'pdf' && (
                          <a
                            href={msg.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`mt-1 flex items-center gap-2 text-xs underline ${isOwn ? 'text-white/80' : 'text-primary'}`}
                          >
                            <FileText size={14} />
                            <span className="truncate max-w-[180px]">{msg.attachment_original_name ?? 'document.pdf'}</span>
                            <Download size={12} className="flex-shrink-0" />
                          </a>
                        )}
                        {msg.attachment_url && msg.attachment_type === 'audio' && (
                          <div className="mt-1">
                            <audio controls className="max-w-full h-8">
                              <source src={msg.attachment_url} />
                            </audio>
                          </div>
                        )}
                      </div>
                      <p className={`text-xs text-gray-400 mt-1 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>
                        {format(new Date(msg.sent_at), 'HH:mm', { locale: fr })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message input - only if allowed */}
      {canWrite ? (
        <div className="bg-white border-t border-gray-200 flex-shrink-0">
          {selectedFile && (
            <div className="px-3 md:px-4 pt-3 flex items-center gap-2">
              <div className="flex items-center gap-2 bg-primary/10 text-primary text-xs px-3 py-1.5 rounded-lg max-w-xs">
                {selectedFile.type.startsWith('image/') ? (
                  <Paperclip size={14} />
                ) : selectedFile.type === 'application/pdf' ? (
                  <FileText size={14} />
                ) : (
                  <Music size={14} />
                )}
                <span className="truncate">{selectedFile.name}</span>
                <span className="text-primary/60 flex-shrink-0">({formatFileSize(selectedFile.size)})</span>
              </div>
              <button onClick={() => setSelectedFile(null)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
          )}
          <form onSubmit={sendGroupMessage} className="p-3 md:p-4 flex gap-2 md:gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Joindre un fichier"
            >
              <Paperclip size={20} />
            </button>
            <input
              type="text"
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder="Ecrivez votre message..."
              className="flex-1 px-3 md:px-4 py-2.5 md:py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm md:text-base min-h-[44px]"
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={isSending || (!messageContent.trim() && !selectedFile)}
              className="px-4 md:px-6 py-2.5 md:py-3 bg-primary text-white rounded-xl hover:bg-primary/90 active:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-h-[44px] min-w-[44px]"
            >
              {isSending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Send size={20} />
              )}
            </button>
          </form>
        </div>
      ) : (
        <div className="p-3 md:p-4 bg-yellow-50 border-t border-yellow-200 text-center flex-shrink-0">
          <p className="text-yellow-700 text-xs md:text-sm flex items-center justify-center gap-2">
            <Lock size={14} />
            Ce groupe est en lecture seule
          </p>
        </div>
      )}
    </div>
  );
}
